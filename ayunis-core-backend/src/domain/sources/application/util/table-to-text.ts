import type { ParsedSheet } from 'src/domain/sources/application/ports/spreadsheet-parser.port';

// Every row repeats its headers so a chunk cut anywhere in the sheet still
// carries the column meaning for semantic search.
export function tableToText(sheets: ParsedSheet[], withSheetNames: boolean) {
  return sheets
    .map((sheet) => {
      const rows = sheet.rows
        .map((row) =>
          sheet.headers
            .map((header, i) => [header, row[i] ?? ''])
            .filter(([, value]) => value !== '')
            .map(([header, value]) => (header ? `${header}: ${value}` : value))
            .join(' | '),
        )
        .filter((line) => line !== '');
      const title = withSheetNames ? [`## ${sheet.sheetName}`] : [];
      return rows.length ? [...title, ...rows].join('\n') : '';
    })
    .filter((block) => block !== '')
    .join('\n\n');
}
