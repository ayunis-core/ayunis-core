import * as fs from 'fs';
import { parseCSV } from 'src/common/util/csv';
import { parseExcel } from 'src/common/util/excel';
import { CreateCSVDataSourceCommand } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.command';

/**
 * Parse a CSV file and return a data source command.
 */
export function buildCsvSourceCommand(file: {
  originalname: string;
  path: string;
}): CreateCSVDataSourceCommand {
  const fileData = fs.readFileSync(file.path, 'utf8');
  const { headers, data } = parseCSV(fileData);
  return new CreateCSVDataSourceCommand({
    name: file.originalname,
    data: { headers, rows: data },
  });
}

/**
 * Parse a spreadsheet file and return one data source command per sheet.
 * Returns an empty array if the spreadsheet contains no sheets.
 */
export function buildSpreadsheetSourceCommands(file: {
  originalname: string;
  path: string;
}): CreateCSVDataSourceCommand[] {
  const fileData = fs.readFileSync(file.path);
  const sheets = parseExcel(fileData);

  if (sheets.length === 0) {
    return [];
  }

  const baseFileName = file.originalname.replace(/\.(xlsx|xls)$/i, '');
  return sheets.map((sheet) => {
    const sourceName =
      sheets.length === 1
        ? `${baseFileName}.csv`
        : `${baseFileName}_${sheet.sheetName.replace(/\s+/g, '_')}.csv`;

    return new CreateCSVDataSourceCommand({
      name: sourceName,
      data: { headers: sheet.headers, rows: sheet.rows },
    });
  });
}
