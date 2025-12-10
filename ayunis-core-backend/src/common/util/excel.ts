import * as XLSX from 'xlsx';

export interface ParsedSheet {
  sheetName: string;
  headers: string[];
  rows: string[][];
}

/**
 * Parses an Excel file (xlsx/xls) and converts each sheet to CSV format.
 * @param buffer - The Excel file buffer
 * @returns Array of parsed sheets, each containing sheet name, headers, and rows
 */
export function parseExcel(buffer: Buffer): ParsedSheet[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const result: ParsedSheet[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];

    // Convert sheet to array of arrays (rows)
    const data: string[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false, // Convert all values to strings
    });

    // Skip empty sheets
    if (data.length === 0) {
      continue;
    }

    // First row is headers
    const headers = data[0].map((cell) => String(cell ?? ''));
    // Remaining rows are data
    const rows = data
      .slice(1)
      .map((row) => row.map((cell) => String(cell ?? '')));

    // Skip sheets that only have headers with no data rows
    // (but include sheets with at least headers)
    if (headers.length > 0) {
      result.push({
        sheetName,
        headers,
        rows,
      });
    }
  }

  return result;
}
