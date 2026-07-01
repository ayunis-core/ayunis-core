import { parse, unparse } from 'papaparse';

export interface ParsedCSV {
  headers: string[];
  data: string[][];
}

/**
 * Parse a CSV string into headers and data rows.
 *
 * Uses a spec-compliant (RFC 4180) parser: quoted fields containing the
 * delimiter or newlines are kept intact, doubled quotes are unescaped, and
 * `\r\n`/`\n` line endings are both handled. When `separator` is omitted the
 * delimiter is auto-detected across the whole file (comma, semicolon, tab,
 * pipe), not just from the header line.
 */
export function parseCSV(csv: string, separator?: string): ParsedCSV {
  const result = parse<string[]>(csv, {
    delimiter: separator ?? '',
    skipEmptyLines: true,
  });
  const rows = result.data;
  if (rows.length === 0) {
    return { headers: [], data: [] };
  }
  const [headers, ...data] = rows;
  return { headers, data };
}

/**
 * Serialize headers and rows back into a comma-delimited RFC 4180 CSV string.
 * Every field is quoted (`quotes: true`) so the output is unambiguous for
 * downstream parsers and consistent with the admin export format. Inverse of
 * {@link parseCSV}.
 */
export function convertCSVToString(data: {
  headers: string[];
  rows: string[][];
}): string {
  return unparse(
    { fields: data.headers, data: data.rows },
    { quotes: true, newline: '\n' },
  );
}
