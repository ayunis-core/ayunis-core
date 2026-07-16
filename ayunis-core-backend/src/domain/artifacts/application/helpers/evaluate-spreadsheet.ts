import FormulaParser, { DepParser, FormulaError } from 'fast-formula-parser';
import type { CellRef, RangeRef } from 'fast-formula-parser';
import type {
  SpreadsheetCell,
  SpreadsheetGrid,
} from './spreadsheet-content-format';
import { isFormulaCell } from './spreadsheet-content-format';

/**
 * Server-side spreadsheet evaluation for exports. Formulas use sheet
 * coordinates: the header row is row 1, data row d lives at sheet row d + 2.
 *
 * Deliberately mirrors the frontend widget's engine (accepted duplication,
 * like the parse/serialize helpers); this variant is instance-based and works
 * on typed spreadsheet cells rather than serialized JSON.
 */

export type EvaluatedCell = string | number | boolean | null;

const CYCLE_ERROR = '#CYCLE!';
const SHEET_NAME = 'Sheet1';

/**
 * Bounds the synchronous work performed by one export. Exports that exceed a
 * bound fall back to writing formulas as text instead of monopolizing the API
 * worker with a crafted dependency graph.
 */
export const DEFAULT_SPREADSHEET_EVALUATION_BUDGET = {
  maxFormulaCells: 50_000,
  maxReferencedCells: 500_000,
  maxOperations: 750_000,
} as const;

export interface SpreadsheetEvaluationBudget {
  readonly maxFormulaCells: number;
  readonly maxReferencedCells: number;
  readonly maxOperations: number;
}

export class SpreadsheetEvaluationBudgetExceededError extends Error {
  constructor(metric: keyof SpreadsheetEvaluationBudget, limit: number) {
    super(`Spreadsheet evaluation budget exceeded (${metric} > ${limit})`);
    this.name = SpreadsheetEvaluationBudgetExceededError.name;
  }
}

const SPREADSHEET_ERROR_VALUES = new Set([
  '#CALC!',
  '#CYCLE!',
  '#DIV/0!',
  '#ERROR!',
  '#NAME?',
  '#N/A',
  '#NULL!',
  '#NUM!',
  '#REF!',
  '#SPILL!',
  '#VALUE!',
]);

export const isSpreadsheetErrorValue = (value: unknown): value is string =>
  typeof value === 'string' && SPREADSHEET_ERROR_VALUES.has(value);

// Mirrors the UI engine's input coercion (coerceCell in the widget's
// spreadsheet-content-format.ts) so a sheet whose numbers were stored as strings
// evaluates to the same results in the grid and in exports.
const NUMERIC_CELL_RE = /^-?(0|[1-9]\d*)(\.\d+)?$/;

const coerceNumericString = (value: SpreadsheetCell): SpreadsheetCell =>
  typeof value === 'string' && NUMERIC_CELL_RE.test(value)
    ? Number(value)
    : value;

/**
 * Wrapper for evaluation results: sonarjs/function-return-type rejects
 * functions returning a primitive union, and that union is exactly what a
 * spreadsheet cell evaluates to.
 */
interface Evaluated {
  value: EvaluatedCell;
  isEvaluable: boolean;
}

export interface SpreadsheetEvaluation {
  values: EvaluatedCell[][];
  liveFormulaCells: boolean[][];
}

export class SpreadsheetEvaluator {
  private readonly parser: FormulaParser;
  private readonly dependencyParser: DepParser;
  private readonly results = new Map<string, Evaluated>();
  private readonly visiting = new Set<string>();
  private readonly formulaCellMask: boolean[][];
  private formulaCellCount = 0;
  private referencedCellCount = 0;
  private operationCount = 0;

  constructor(
    private readonly data: SpreadsheetGrid,
    formulaCellMask = data.rows.map((row) => row.map(isFormulaCell)),
    private readonly budget: SpreadsheetEvaluationBudget = DEFAULT_SPREADSHEET_EVALUATION_BUDGET,
  ) {
    this.formulaCellMask = formulaCellMask;
    this.dependencyParser = new DepParser();
    this.parser = new FormulaParser({
      onCell: (ref) => {
        this.assertLocalSheet(ref.sheet);
        return this.cellValue(ref.row, ref.col - 1).value;
      },
      onRange: (ref) => {
        this.assertLocalSheet(ref.sheet);
        const values: EvaluatedCell[][] = [];
        const fromRow = Math.min(ref.from.row, ref.to.row);
        const toRow = Math.max(ref.from.row, ref.to.row);
        const fromCol = Math.min(ref.from.col, ref.to.col);
        const toCol = Math.max(ref.from.col, ref.to.col);
        const maxRow = this.data.rows.length + 1;
        const maxCol = this.data.columns.length;
        for (
          let row = Math.max(1, fromRow);
          row <= Math.min(toRow, maxRow);
          row++
        ) {
          const line: EvaluatedCell[] = [];
          for (
            let col = Math.max(1, fromCol);
            col <= Math.min(toCol, maxCol);
            col++
          ) {
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
    return this.evaluateForExport().values;
  }

  evaluateForExport(): SpreadsheetEvaluation {
    const values: EvaluatedCell[][] = [];
    const liveFormulaCells: boolean[][] = [];

    this.data.rows.forEach((row, dataRow) => {
      const evaluatedRow: EvaluatedCell[] = [];
      const liveFormulaRow: boolean[] = [];

      row.forEach((cell, col) => {
        if (!this.isFormulaCellAt(dataRow, col, cell)) {
          evaluatedRow.push(cell);
          liveFormulaRow.push(false);
          return;
        }

        const evaluated = this.formulaValue(dataRow, col, cell);
        evaluatedRow.push(normalizeFormulaResult(evaluated.value));
        liveFormulaRow.push(evaluated.isEvaluable);
      });

      values.push(evaluatedRow);
      liveFormulaCells.push(liveFormulaRow);
    });

    return { values, liveFormulaCells };
  }

  private cellValue(sheetRow: number, col: number): Evaluated {
    let value: EvaluatedCell = null;
    if (sheetRow === 1) {
      value = this.data.columns[col] ?? null;
    } else {
      const raw: SpreadsheetCell = this.data.rows[sheetRow - 2]?.[col] ?? null;
      if (this.isFormulaCellAt(sheetRow - 2, col, raw)) {
        const evaluated = this.formulaValue(sheetRow - 2, col, raw);
        if (isSpreadsheetErrorValue(evaluated.value)) {
          // Propagate errors into dependent formulas, like Excel
          throw new FormulaError(evaluated.value);
        }
        value = evaluated.value;
      } else {
        value = coerceNumericString(raw);
      }
    }
    return { value, isEvaluable: true };
  }

  private isFormulaCellAt(
    dataRow: number,
    col: number,
    cell: SpreadsheetCell,
  ): cell is string {
    return this.formulaCellMask[dataRow]?.[col] === true && isFormulaCell(cell);
  }

  private formulaValue(
    dataRow: number,
    col: number,
    formula: string,
  ): Evaluated {
    const key = `${dataRow}:${col}`;
    if (this.visiting.has(key)) {
      return { value: CYCLE_ERROR, isEvaluable: false };
    }
    const memoized = this.results.get(key);
    if (memoized !== undefined) {
      return memoized;
    }

    this.consumeFormulaCell();
    this.visiting.add(key);
    let value: EvaluatedCell;
    let isEvaluable = false;
    try {
      this.assertLocalReferences(formula, {
        row: dataRow + 2,
        col: col + 1,
        sheet: SHEET_NAME,
      });
      const parsed = this.parser.parse(formula.slice(1), {
        row: dataRow + 2,
        col: col + 1,
        sheet: SHEET_NAME,
      });
      if (parsed instanceof FormulaError) {
        this.assertNoBudgetError(parsed);
      }
      value = parsed instanceof FormulaError ? parsed.error : parsed;
      isEvaluable = !(parsed instanceof FormulaError);
    } catch (error) {
      if (error instanceof SpreadsheetEvaluationBudgetExceededError) {
        throw error;
      }
      value = this.errorCode(error);
    }
    this.visiting.delete(key);
    const evaluated = { value, isEvaluable };
    this.results.set(key, evaluated);
    return evaluated;
  }

  private assertLocalReferences(
    formula: string,
    position: { row: number; col: number; sheet: string },
  ): void {
    const references = this.dependencyParser.parse(formula.slice(1), position);
    for (const reference of references) {
      this.assertLocalSheet(reference.sheet);
      this.consumeReferencedCells(this.referenceSize(reference));
    }
  }

  private assertLocalSheet(sheet: string | undefined): void {
    if (
      sheet !== undefined &&
      sheet.toUpperCase() !== SHEET_NAME.toUpperCase()
    ) {
      throw new FormulaError('#REF!');
    }
  }

  private assertNoBudgetError(error: unknown): void {
    if (error instanceof SpreadsheetEvaluationBudgetExceededError) {
      throw error;
    }
    if (error instanceof FormulaError) {
      this.assertNoBudgetError(error.details);
    }
  }

  private consumeFormulaCell(): void {
    this.consumeOperation();
    this.formulaCellCount += 1;
    this.assertWithinBudget(
      'maxFormulaCells',
      this.formulaCellCount,
      this.budget.maxFormulaCells,
    );
  }

  private consumeReferencedCells(count: number): void {
    this.operationCount += count;
    this.referencedCellCount += count;
    this.assertWithinBudget(
      'maxOperations',
      this.operationCount,
      this.budget.maxOperations,
    );
    this.assertWithinBudget(
      'maxReferencedCells',
      this.referencedCellCount,
      this.budget.maxReferencedCells,
    );
  }

  private consumeOperation(): void {
    this.operationCount += 1;
    this.assertWithinBudget(
      'maxOperations',
      this.operationCount,
      this.budget.maxOperations,
    );
  }

  private assertWithinBudget(
    metric: keyof SpreadsheetEvaluationBudget,
    value: number,
    limit: number,
  ): void {
    if (value > limit) {
      throw new SpreadsheetEvaluationBudgetExceededError(metric, limit);
    }
  }

  private referenceSize(reference: CellRef | RangeRef): number {
    if (!('from' in reference)) {
      return 1;
    }

    const maxRow = this.data.rows.length + 1;
    const maxCol = this.data.columns.length;
    const fromRow = Math.max(1, Math.min(reference.from.row, reference.to.row));
    const toRow = Math.min(
      maxRow,
      Math.max(reference.from.row, reference.to.row),
    );
    const fromCol = Math.max(1, Math.min(reference.from.col, reference.to.col));
    const toCol = Math.min(
      maxCol,
      Math.max(reference.from.col, reference.to.col),
    );
    if (fromRow > toRow || fromCol > toCol) {
      return 0;
    }
    return (toRow - fromRow + 1) * (toCol - fromCol + 1);
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

function normalizeFormulaResult(value: EvaluatedCell): EvaluatedCell {
  return typeof value === 'number' ? Number(value.toPrecision(15)) : value;
}
