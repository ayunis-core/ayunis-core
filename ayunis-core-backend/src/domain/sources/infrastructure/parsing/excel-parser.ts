import * as XLSX from 'xlsx';
import type { ParsedSheet } from '../../application/ports/spreadsheet-parser.port';

type SheetRow = unknown[];

/**
 * Reads at most one row per sheet, so callers can learn which sheets contain
 * data without paying for a full parse. Sheets without a single used cell get
 * no `!ref` and are omitted — mirroring parseExcelBuffer, which drops them.
 * A sheet whose used range holds only blank cells still slips through here;
 * the processing consumer marks its pre-created source FAILED as a fallback.
 */
export function listDataSheetNames(buffer: Buffer): string[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', sheetRows: 1 });
  return workbook.SheetNames.filter((sheetName) =>
    Boolean(workbook.Sheets[sheetName]['!ref']),
  );
}

/**
 * Pure, synchronous parse of an Excel workbook into per-sheet CSV data.
 * XLSX parsing is CPU-bound — request-path code must go through
 * SpreadsheetParserPort, which runs this in a worker thread.
 */
export function parseExcelBuffer(buffer: Buffer): ParsedSheet[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  return workbook.SheetNames.flatMap((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];

    // Despite raw:false, cells are not guaranteed to be strings — treat
    // them as unknown and stringify.
    const rows: SheetRow[] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    const parsed = parseSheet(sheetName, rows);
    return parsed ? [parsed] : [];
  });
}

function parseSheet(
  sheetName: string,
  rawRows: SheetRow[],
): ParsedSheet | null {
  const firstNonEmptyRowIndex = rawRows.findIndex((row) => !isEmptyRow(row));
  if (firstNonEmptyRowIndex === -1) {
    return null;
  }

  const [headers, ...rows] = rawRows
    .slice(firstNonEmptyRowIndex)
    .map(normalizeRow);

  if (headers.length === 0) {
    return null;
  }

  // Header-only sheets are kept intentionally: an empty table with named
  // columns is still a valid data source.
  return { sheetName, headers, rows };
}

function isEmptyRow(row: SheetRow): boolean {
  return row.every((cell) => normalizeCell(cell) === '');
}

function normalizeRow(row: SheetRow): string[] {
  return row.map(normalizeCell);
}

function normalizeCell(cell: unknown): string {
  if (cell === null || cell === undefined) {
    return '';
  }
  if (typeof cell === 'string') {
    return cell;
  }
  if (typeof cell === 'number' || typeof cell === 'boolean') {
    return String(cell);
  }
  return JSON.stringify(cell);
}
