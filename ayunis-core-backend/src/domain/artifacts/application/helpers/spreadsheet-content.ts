import {
  ArtifactContentTooLargeError,
  InvalidSpreadsheetContentError,
  ARTIFACT_MAX_CONTENT_LENGTH,
  MAX_SPREADSHEET_COLUMNS,
  MAX_SPREADSHEET_FORMULA_LENGTH,
  MAX_SPREADSHEET_ROWS,
} from '../artifacts.errors';

export const SPREADSHEET_CONTENT_FORMAT = 'spreadsheet-v1';

export type SpreadsheetCell = string | number | null;

export interface SpreadsheetContentV1 {
  format: typeof SPREADSHEET_CONTENT_FORMAT;
  columns: string[];
  rows: SpreadsheetCell[][];
}

export interface SpreadsheetData {
  columns: string[];
  rows: SpreadsheetCell[][];
}

function isSpreadsheetCell(value: unknown): value is SpreadsheetCell {
  return (
    value === null ||
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

/**
 * A string cell starting with '=' is an Excel formula (A1 notation against
 * the exported layout: headers are row 1, data starts at row 2). Formulas are
 * stored as plain text and evaluated only at display/export time.
 */
export function isFormulaCell(cell: SpreadsheetCell): cell is string {
  return typeof cell === 'string' && cell.startsWith('=');
}

function validateColumns(columns: unknown): asserts columns is string[] {
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new InvalidSpreadsheetContentError(
      'columns must be a non-empty array',
    );
  }
  if (columns.length > MAX_SPREADSHEET_COLUMNS) {
    throw new InvalidSpreadsheetContentError(
      `column count (${columns.length}) exceeds maximum (${MAX_SPREADSHEET_COLUMNS})`,
    );
  }
  if (columns.some((column) => typeof column !== 'string')) {
    throw new InvalidSpreadsheetContentError('column headers must be strings');
  }
}

function validateRows(rows: unknown): asserts rows is SpreadsheetCell[][] {
  if (!Array.isArray(rows)) {
    throw new InvalidSpreadsheetContentError('rows must be an array');
  }
  if (rows.length > MAX_SPREADSHEET_ROWS) {
    throw new InvalidSpreadsheetContentError(
      `row count (${rows.length}) exceeds maximum (${MAX_SPREADSHEET_ROWS})`,
    );
  }
  rows.forEach((row: unknown, index) => {
    if (!Array.isArray(row)) {
      throw new InvalidSpreadsheetContentError(`row ${index} must be an array`);
    }
    if (!row.every(isSpreadsheetCell)) {
      throw new InvalidSpreadsheetContentError(
        `row ${index} contains an invalid cell; cells must be strings, finite numbers, or null`,
      );
    }
    if (
      row.some(
        (cell) =>
          isFormulaCell(cell) && cell.length > MAX_SPREADSHEET_FORMULA_LENGTH,
      )
    ) {
      throw new InvalidSpreadsheetContentError(
        `row ${index} contains a formula longer than ${MAX_SPREADSHEET_FORMULA_LENGTH} characters`,
      );
    }
  });
}

export function parseSpreadsheetContent(raw: string): SpreadsheetContentV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidSpreadsheetContentError('content is not valid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new InvalidSpreadsheetContentError('content must be a JSON object');
  }

  const candidate = parsed as Record<string, unknown>;
  if (candidate.format !== SPREADSHEET_CONTENT_FORMAT) {
    throw new InvalidSpreadsheetContentError(
      `format must be '${SPREADSHEET_CONTENT_FORMAT}'`,
    );
  }
  validateColumns(candidate.columns);
  validateRows(candidate.rows);

  return {
    format: SPREADSHEET_CONTENT_FORMAT,
    columns: candidate.columns,
    rows: candidate.rows,
  };
}

function normalizeRow(
  row: SpreadsheetCell[],
  columnCount: number,
): SpreadsheetCell[] {
  const normalized = row.slice(0, columnCount);
  while (normalized.length < columnCount) {
    normalized.push(null);
  }
  return normalized;
}

export function serializeSpreadsheetContent(data: SpreadsheetData): string {
  validateColumns(data.columns);
  validateRows(data.rows);

  const content: SpreadsheetContentV1 = {
    format: SPREADSHEET_CONTENT_FORMAT,
    columns: data.columns,
    rows: data.rows.map((row) => normalizeRow(row, data.columns.length)),
  };

  const serialized = JSON.stringify(content);
  if (serialized.length > ARTIFACT_MAX_CONTENT_LENGTH) {
    throw new ArtifactContentTooLargeError(
      serialized.length,
      ARTIFACT_MAX_CONTENT_LENGTH,
    );
  }
  return serialized;
}

export function mapSpreadsheetStrings(
  data: SpreadsheetContentV1,
  fn: (value: string) => string,
): SpreadsheetContentV1 {
  return {
    format: SPREADSHEET_CONTENT_FORMAT,
    columns: data.columns.map(fn),
    rows: data.rows.map((row) =>
      row.map((cell) => (typeof cell === 'string' ? fn(cell) : cell)),
    ),
  };
}
