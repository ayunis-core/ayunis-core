import * as XLSX from 'xlsx';
import type { ParsedSheet } from '../../application/ports/spreadsheet-parser.port';

type SheetRow = unknown[];

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
