import type { SpreadsheetGrid } from '../helpers/spreadsheet-content-format';

export interface SpreadsheetExportInput {
  grid: SpreadsheetGrid;
  formulaCells: boolean[][];
}

export abstract class SpreadsheetExportPort {
  abstract exportToXlsx(data: SpreadsheetExportInput): Promise<Buffer>;
  abstract exportToCsv(data: SpreadsheetExportInput): Promise<string>;
}
