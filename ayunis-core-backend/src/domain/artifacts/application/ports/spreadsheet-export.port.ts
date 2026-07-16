import type { SpreadsheetData } from '../helpers/spreadsheet-content';

export abstract class SpreadsheetExportPort {
  abstract exportToXlsx(data: SpreadsheetData): Promise<Buffer>;
  abstract exportToCsv(data: SpreadsheetData): Promise<string>;
}
