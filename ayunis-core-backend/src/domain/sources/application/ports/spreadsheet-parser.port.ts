export interface ParsedSheet {
  sheetName: string;
  headers: string[];
  rows: string[][];
}

export interface ParsedCsvData {
  headers: string[];
  rows: string[][];
}

/**
 * Port for CPU-bound tabular-file parsing (xlsx/xls/csv). Implementations
 * must run off the event loop — parsing happens in the API process.
 */
export abstract class SpreadsheetParserPort {
  abstract parseWorkbook(buffer: Buffer): Promise<ParsedSheet[]>;
  /** Names of sheets that contain data — empty sheets are omitted. */
  abstract listDataSheets(buffer: Buffer): Promise<string[]>;
  abstract parseCsv(text: string): Promise<ParsedCsvData>;
}
