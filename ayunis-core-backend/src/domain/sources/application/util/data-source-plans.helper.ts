import type { SpreadsheetParserPort } from 'src/domain/sources/application/ports/spreadsheet-parser.port';
import type { DataSourceFileKind } from 'src/domain/sources/domain/data-source-file-kind.type';
import { EmptyFileDataError } from 'src/domain/sources/application/sources.errors';

/** One CSV source to create for a table upload: a sheet, or the whole CSV. */
export interface DataSourcePlan {
  name: string;
  sheetName: string | null;
}

/**
 * A CSV yields one source; a workbook yields one per data sheet (cheap
 * first-row-only parse). A workbook without data sheets is rejected here,
 * before any source exists.
 */
export async function resolveDataSourcePlans(
  parser: SpreadsheetParserPort,
  file: { fileData: Buffer; fileName: string; kind: DataSourceFileKind },
): Promise<DataSourcePlan[]> {
  if (file.kind === 'csv') {
    return [{ name: file.fileName, sheetName: null }];
  }

  const sheetNames = await parser.listDataSheets(file.fileData);
  if (sheetNames.length === 0) {
    throw new EmptyFileDataError(file.fileName);
  }

  const baseFileName = file.fileName.replace(/\.(xlsx|xls|ods)$/i, '');
  return sheetNames.map((sheetName) => ({
    sheetName,
    name:
      sheetNames.length === 1
        ? `${baseFileName}.csv`
        : `${baseFileName}_${sheetName.replace(/\s+/g, '_')}.csv`,
  }));
}
