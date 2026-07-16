import type { ReferenceAdjustment } from './formula-references';
import { adjustFormulaReferences } from './formula-references';

export const SPREADSHEET_CONTENT_FORMAT = 'spreadsheet-v1';

export type SpreadsheetCell = string | number | null;

export interface SpreadsheetContent {
  columns: string[];
  rows: SpreadsheetCell[][];
}

export interface ParsedSpreadsheetContent {
  data: SpreadsheetContent;
  isValid: boolean;
}

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

const EMPTY_CONTENT: SpreadsheetContent = { columns: [], rows: [] };

// Intentionally excludes leading zeros ("007") and exponent notation so
// identifier-like values survive a save/load round trip as strings.
const NUMERIC_CELL_RE = /^-?(0|[1-9]\d*)(\.\d+)?$/;

function isCellValue(value: unknown): value is string | number {
  return (
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

const sanitizeCell = (value: unknown): SpreadsheetCell =>
  isCellValue(value) ? value : null;

function normalizeRow(row: unknown, columnCount: number): SpreadsheetCell[] {
  const cells = Array.isArray(row) ? row : [];
  return Array.from({ length: columnCount }, (_, i) => sanitizeCell(cells[i]));
}

/**
 * Lenient counterpart of the backend parser: instead of throwing on malformed
 * content it falls back to an empty sheet with `isValid: false`, so a corrupt
 * artifact never crashes the panel.
 */
export function parseSpreadsheetContent(raw: string): ParsedSpreadsheetContent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { data: EMPTY_CONTENT, isValid: false };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { data: EMPTY_CONTENT, isValid: false };
  }

  const candidate = parsed as Record<string, unknown>;
  const { columns, rows } = candidate;
  if (
    candidate.format !== SPREADSHEET_CONTENT_FORMAT ||
    !Array.isArray(columns) ||
    !columns.every((c) => typeof c === 'string') ||
    !Array.isArray(rows)
  ) {
    return { data: EMPTY_CONTENT, isValid: false };
  }

  return {
    data: {
      columns,
      rows: rows.map((row) => normalizeRow(row, columns.length)),
    },
    isValid: true,
  };
}

export function serializeSpreadsheetContent(data: SpreadsheetContent): string {
  return JSON.stringify({
    format: SPREADSHEET_CONTENT_FORMAT,
    columns: data.columns,
    rows: data.rows,
  });
}

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

/**
 * A string starting with '=' is an Excel formula (A1 notation against the
 * exported layout: headers are row 1, data starts at row 2). Shown as raw
 * text in the grid; evaluated at export time.
 */
export const isFormulaValue = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.startsWith('=');

const parseNumericCell = (value: string): SpreadsheetCell =>
  NUMERIC_CELL_RE.test(value) ? Number(value) : value;

export const coerceCell = (
  value: string | null | undefined,
): SpreadsheetCell => (value ? parseNumericCell(value) : null);

export function fromGridState(state: GridState): SpreadsheetContent {
  return {
    columns: [...state.columns],
    rows: state.rows.map((row) =>
      state.columns.map((_, i) => coerceCell(row[columnKey(i)])),
    ),
  };
}

export function addColumn(state: GridState, label: string): GridState {
  return {
    columns: [...state.columns, label],
    rows: state.rows.map((row) => ({
      ...row,
      [columnKey(state.columns.length)]: null,
    })),
  };
}

export function renameColumn(
  state: GridState,
  index: number,
  label: string,
): GridState {
  return {
    columns: state.columns.map((c, i) => (i === index ? label : c)),
    rows: state.rows,
  };
}

function mapFormulaCells(
  rows: GridRow[],
  adjustment: ReferenceAdjustment,
): GridRow[] {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        isFormulaValue(value)
          ? adjustFormulaReferences(value as string, adjustment)
          : value,
      ]),
    ),
  );
}

export function deleteColumn(state: GridState, index: number): GridState {
  const rewritten = mapFormulaCells(state.rows, {
    axis: 'column',
    index,
    delta: -1,
  });
  const columns = state.columns.filter((_, i) => i !== index);
  return {
    columns,
    rows: rewritten.map((row) =>
      Object.fromEntries(
        columns.map((_, i) => [
          columnKey(i),
          row[columnKey(i < index ? i : i + 1)] ?? null,
        ]),
      ),
    ),
  };
}

export interface RowOperation {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  fromRowIndex: number;
  toRowIndex: number;
}

/**
 * Rewrites formula references after grid row insertions/deletions. Applied to
 * the post-operation rows; each inserted/deleted row shifts references one
 * step, so multi-row operations are applied iteratively.
 */
export function rewriteFormulasForRowOperations(
  rows: GridRow[],
  operations: RowOperation[],
): GridRow[] {
  let result = rows;
  for (const operation of operations) {
    if (operation.type === 'UPDATE') {
      continue;
    }
    const count = operation.toRowIndex - operation.fromRowIndex;
    const delta = operation.type === 'CREATE' ? 1 : -1;
    for (let i = 0; i < count; i++) {
      result = mapFormulaCells(result, {
        axis: 'row',
        index: operation.fromRowIndex,
        delta,
      });
    }
  }
  return result;
}

export function columnHasData(state: GridState, index: number): boolean {
  const key = columnKey(index);
  return state.rows.some((row) => Boolean(row[key]));
}
