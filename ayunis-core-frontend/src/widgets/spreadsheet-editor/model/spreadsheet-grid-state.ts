import type {
  SpreadsheetCell,
  SpreadsheetContent,
} from './spreadsheet-content-format';

export const MAX_SPREADSHEET_COLUMNS = 100;
export const MAX_SPREADSHEET_ROWS = 5000;

/**
 * Grid rows use positional keys (c0..cN) instead of header labels so renaming
 * a column doesn't orphan its cells and duplicate labels stay unambiguous.
 */
export type GridRow = Record<string, string | null>;

export interface GridState {
  columns: string[];
  rows: GridRow[];
}

export function columnKey(index: number): string {
  return `c${index}`;
}

// Intentionally excludes leading zeros ("007") and exponent notation so
// identifier-like values survive a save/load round trip as strings.
const NUMERIC_CELL_RE = /^-?(0|[1-9]\d*)(\.\d+)?$/;

const parseNumericCell = (value: string): SpreadsheetCell =>
  NUMERIC_CELL_RE.test(value) ? Number(value) : value;

export const coerceCell = (
  value: string | null | undefined,
): SpreadsheetCell => (value ? parseNumericCell(value) : null);

export function toGridState(data: SpreadsheetContent): GridState {
  return {
    columns: [...data.columns],
    rows: data.rows.map((row) =>
      Object.fromEntries(
        row.map((cell, i) => [
          columnKey(i),
          cell === null ? null : String(cell),
        ]),
      ),
    ),
  };
}

export function fromGridState(state: GridState): SpreadsheetContent {
  return {
    columns: [...state.columns],
    rows: state.rows.map((row) =>
      state.columns.map((_, i) => coerceCell(row[columnKey(i)])),
    ),
  };
}
