import FormulaParser, { FormulaError } from 'fast-formula-parser';
import type { SpreadsheetCell, SpreadsheetData } from './spreadsheet-content';
import { isFormulaCell } from './spreadsheet-content';

/**
 * Server-side spreadsheet evaluation for exports. Formulas use sheet
 * coordinates: the header row is row 1, data row d lives at sheet row d + 2.
 *
 * Deliberately mirrors the frontend widget's engine (accepted duplication,
 * like the parse/serialize helpers); this variant is instance-based and works
 * on typed SpreadsheetData cells rather than grid rows.
 */

export type EvaluatedCell = string | number | boolean | null;

const CYCLE_ERROR = '#CYCLE!';

/**
 * Wrapper for evaluation results: sonarjs/function-return-type rejects
 * functions returning a primitive union, and that union is exactly what a
 * spreadsheet cell evaluates to.
 */
interface Evaluated {
  value: EvaluatedCell;
}

export class SpreadsheetEvaluator {
  private readonly parser: FormulaParser;
  private readonly results = new Map<string, EvaluatedCell>();
  private readonly visiting = new Set<string>();

  constructor(private readonly data: SpreadsheetData) {
    this.parser = new FormulaParser({
      onCell: (ref) => this.cellValue(ref.row, ref.col - 1).value,
      onRange: (ref) => {
        const values: EvaluatedCell[][] = [];
        for (let row = ref.from.row; row <= ref.to.row; row++) {
          const line: EvaluatedCell[] = [];
          for (let col = ref.from.col; col <= ref.to.col; col++) {
            line.push(this.cellValue(row, col - 1).value);
          }
          values.push(line);
        }
        return values;
      },
    });
  }

  /**
   * Returns the sheet with every formula cell replaced by its evaluated
   * value (or an #ERROR!-style code); plain cells pass through unchanged.
   */
  evaluate(): EvaluatedCell[][] {
    return this.data.rows.map((row, dataRow) =>
      row.map((cell, col) =>
        isFormulaCell(cell)
          ? this.formulaValue(dataRow, col, cell).value
          : cell,
      ),
    );
  }

  private cellValue(sheetRow: number, col: number): Evaluated {
    let value: EvaluatedCell = null;
    if (sheetRow === 1) {
      value = this.data.columns[col] ?? null;
    } else {
      const raw: SpreadsheetCell = this.data.rows[sheetRow - 2]?.[col] ?? null;
      if (isFormulaCell(raw)) {
        const evaluated = this.formulaValue(sheetRow - 2, col, raw).value;
        if (typeof evaluated === 'string' && evaluated.startsWith('#')) {
          // Propagate errors into dependent formulas, like Excel
          throw new FormulaError(evaluated);
        }
        value = evaluated;
      } else {
        value = raw;
      }
    }
    return { value };
  }

  private formulaValue(
    dataRow: number,
    col: number,
    formula: string,
  ): Evaluated {
    const key = `${dataRow}:${col}`;
    if (this.visiting.has(key)) {
      return { value: CYCLE_ERROR };
    }
    const memoized = this.results.get(key);
    if (memoized !== undefined) {
      return { value: memoized };
    }

    this.visiting.add(key);
    let value: EvaluatedCell;
    try {
      const parsed = this.parser.parse(formula.slice(1), {
        row: dataRow + 2,
        col: col + 1,
        sheet: 'Sheet1',
      });
      value = parsed instanceof FormulaError ? parsed.error : parsed;
    } catch (error) {
      value = this.errorCode(error);
    }
    this.visiting.delete(key);
    this.results.set(key, value);
    return { value };
  }

  // The parser wraps callback throws in FormulaError('#ERROR!', ..., cause)
  private errorCode(error: unknown): string {
    if (error instanceof FormulaError) {
      return error.details instanceof FormulaError
        ? error.details.error
        : error.error;
    }
    return '#ERROR!';
  }
}
