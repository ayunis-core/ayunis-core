import FormulaParser, { FormulaError } from 'fast-formula-parser';
import type { GridState } from './spreadsheet-content';
import { coerceCell, columnKey, isFormulaValue } from './spreadsheet-content';

/**
 * Evaluates all formula cells of a grid in one pass. Formulas use sheet
 * coordinates: row 1 is the header row, data row d lives at sheet row d + 2.
 *
 * The parser instance is a module singleton (construction builds a full
 * chevrotain grammar); per-evaluation state lives in `context` and is swapped
 * in for the duration of a computeDisplayValues call.
 */

const SHEET = 'Sheet1';

type PlainValue = string | number | boolean | null;

const CYCLE_ERROR: PlainValue = '#CYCLE!';

/**
 * Wrapper for evaluation results: sonarjs/function-return-type rejects
 * functions returning a primitive union, and string | number | boolean | null
 * is exactly what a spreadsheet cell evaluates to.
 */
interface Evaluated {
  value: PlainValue;
}

interface EvaluationContext {
  state: GridState;
  /** Memoized results of formula cells, keyed `${dataRow}:${col}`. */
  results: Map<string, PlainValue>;
  /** Cells currently being evaluated, for cycle detection. */
  visiting: Set<string>;
}

let context: EvaluationContext | null = null;

function rawCell(
  state: GridState,
  dataRow: number,
  col: number,
): string | null {
  return state.rows[dataRow]?.[columnKey(col)] ?? null;
}

/**
 * Resolve a sheet-coordinate cell to its (evaluated) value. Formula cells
 * that evaluated to an error throw so the parser propagates the error into
 * the dependent formula, like Excel does.
 */
const resolveCell = (sheetRow: number, col: number): Evaluated => {
  let result: PlainValue = null;
  if (context && sheetRow === 1) {
    result = context.state.columns[col] ?? null;
  } else if (context) {
    const dataRow = sheetRow - 2;
    const raw = rawCell(context.state, dataRow, col);
    if (raw !== null && isFormulaValue(raw)) {
      const { value } = evaluateFormulaCell(dataRow, col, raw);
      if (typeof value === 'string' && value.startsWith('#')) {
        throw new FormulaError(value);
      }
      result = value;
    } else {
      result = coerceCell(raw);
    }
  }
  return { value: result };
};

// The parser wraps callback throws in FormulaError('#ERROR!', ..., original);
// unwrap so the dependent cell shows the original error code.
function toErrorCode(error: unknown): string {
  if (error instanceof FormulaError) {
    return error.details instanceof FormulaError
      ? error.details.error
      : error.error;
  }
  return '#ERROR!';
}

const parser = new FormulaParser({
  onCell: (ref) => resolveCell(ref.row, ref.col - 1).value,
  onRange: (ref) => {
    const values: PlainValue[][] = [];
    for (let row = ref.from.row; row <= ref.to.row; row++) {
      const line: PlainValue[] = [];
      for (let col = ref.from.col; col <= ref.to.col; col++) {
        line.push(resolveCell(row, col - 1).value);
      }
      values.push(line);
    }
    return values;
  },
});

const evaluateFormulaCell = (
  dataRow: number,
  col: number,
  formula: string,
): Evaluated => {
  let result: PlainValue = null;
  const key = `${dataRow}:${col}`;
  if (context?.visiting.has(key)) {
    result = CYCLE_ERROR;
  } else if (context?.results.has(key)) {
    result = context.results.get(key) ?? null;
  } else if (context) {
    context.visiting.add(key);
    try {
      const parsed = parser.parse(formula.slice(1), {
        row: dataRow + 2,
        col: col + 1,
        sheet: SHEET,
      });
      result = parsed instanceof FormulaError ? parsed.error : parsed;
    } catch (error) {
      result = toErrorCode(error);
    }
    context.visiting.delete(key);
    context.results.set(key, result);
  }
  return { value: result };
};

function toDisplay(value: PlainValue): string {
  if (value === null) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (typeof value === 'number') {
    // Trim float noise like 0.30000000000000004 without touching integers
    return String(Number(value.toPrecision(15)));
  }
  return String(value);
}

/**
 * Returns a display matrix aligned with state.rows: formula cells carry their
 * evaluated result (or an #ERROR! code), plain cells their raw text.
 */
export function computeDisplayValues(state: GridState): string[][] {
  context = { state, results: new Map(), visiting: new Set() };
  try {
    return state.rows.map((_, dataRow) =>
      state.columns.map((__, col) => {
        const raw = rawCell(state, dataRow, col);
        if (raw !== null && isFormulaValue(raw)) {
          return toDisplay(evaluateFormulaCell(dataRow, col, raw).value);
        }
        return raw ?? '';
      }),
    );
  } finally {
    context = null;
  }
}
