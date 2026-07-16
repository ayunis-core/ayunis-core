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

const EMPTY_CONTENT: SpreadsheetContent = { columns: [], rows: [] };

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
