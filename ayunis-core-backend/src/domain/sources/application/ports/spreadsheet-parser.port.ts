export interface ParsedSheet {
  sheetName: string;
  headers: string[];
  rows: string[][];
}

/**
 * Port for parsing spreadsheet files (xlsx/xls) into per-sheet CSV data.
 */
export abstract class SpreadsheetParserPort {
  abstract parse(buffer: Buffer): Promise<ParsedSheet[]>;
}
