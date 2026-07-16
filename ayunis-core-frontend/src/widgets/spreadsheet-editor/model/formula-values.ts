/**
 * A string starting with '=' is an Excel formula (A1 notation against the
 * exported layout: headers are row 1, data starts at row 2).
 */
export const isFormulaValue = (
  value: string | null | undefined,
): value is string => typeof value === 'string' && value.startsWith('=');

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
