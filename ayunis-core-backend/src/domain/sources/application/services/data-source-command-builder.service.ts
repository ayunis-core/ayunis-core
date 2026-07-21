import * as fs from 'fs';
import { Injectable } from '@nestjs/common';
import { parseCSV } from 'src/common/util/csv';
import type { UploadedFileRef } from 'src/common/util/source-file-upload';
import { SpreadsheetParserPort } from '../ports/spreadsheet-parser.port';
import { CreateCSVDataSourceCommand } from '../use-cases/create-data-source/create-data-source.command';

/**
 * Builds CreateCSVDataSourceCommand(s) from uploaded CSV and spreadsheet
 * files. Exported for the thread and skill file-upload use cases, which
 * orchestrate source creation and attachment themselves.
 */
@Injectable()
export class DataSourceCommandBuilderService {
  constructor(private readonly spreadsheetParser: SpreadsheetParserPort) {}

  async buildCsvSourceCommand(
    file: UploadedFileRef,
  ): Promise<CreateCSVDataSourceCommand> {
    const fileData = await fs.promises.readFile(file.path, 'utf8');
    const { headers, data } = parseCSV(fileData);
    return new CreateCSVDataSourceCommand({
      name: file.originalname,
      data: { headers, rows: data },
    });
  }

  /**
   * One command per sheet; empty array if the spreadsheet has no sheets.
   */
  async buildSpreadsheetSourceCommands(
    file: UploadedFileRef,
  ): Promise<CreateCSVDataSourceCommand[]> {
    const fileData = await fs.promises.readFile(file.path);
    const sheets = await this.spreadsheetParser.parse(fileData);

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
}
