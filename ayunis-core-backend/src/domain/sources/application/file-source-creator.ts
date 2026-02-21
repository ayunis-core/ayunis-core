import * as fs from 'fs';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { CreateFileSourceCommand } from 'src/domain/sources/application/use-cases/create-text-source/create-text-source.command';
import { CreateCSVDataSourceCommand } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.command';
import type { DetectedFileType } from 'src/common/util/file-type';
import {
  detectFileType,
  getCanonicalMimeType,
  isDocumentFile,
  isSpreadsheetFile,
  isCSVFile,
} from 'src/common/util/file-type';
import { parseCSV } from 'src/common/util/csv';
import { parseExcel } from 'src/common/util/excel';

interface SourceCreationDeps {
  createTextSource: (command: CreateFileSourceCommand) => Promise<Source>;
  createDataSource: (command: CreateCSVDataSourceCommand) => Promise<Source>;
  throwEmptyFileError: (fileName: string) => never;
  throwUnsupportedTypeError: (type: string) => never;
}

export async function createSourcesFromFile(
  file: Express.Multer.File,
  deps: SourceCreationDeps,
): Promise<Source[]> {
  const detectedType = detectFileType(file.mimetype, file.originalname);

  if (isDocumentFile(detectedType)) {
    return [await createDocumentSource(file, detectedType, deps)];
  }

  if (isCSVFile(detectedType)) {
    return [await createCSVSource(file, deps)];
  }

  if (isSpreadsheetFile(detectedType)) {
    return createSpreadsheetSources(file, deps);
  }

  deps.throwUnsupportedTypeError(
    detectedType === 'unknown' ? file.originalname : detectedType,
  );
}

async function createDocumentSource(
  file: Express.Multer.File,
  detectedType: DetectedFileType,
  deps: SourceCreationDeps,
): Promise<Source> {
  const fileData = fs.readFileSync(file.path);
  const canonicalMimeType = getCanonicalMimeType(detectedType);
  if (!canonicalMimeType) {
    throw new Error(
      `Unable to determine MIME type for detected file type: ${detectedType}`,
    );
  }
  const command = new CreateFileSourceCommand({
    fileType: canonicalMimeType,
    fileData,
    fileName: file.originalname,
  });
  return deps.createTextSource(command);
}

async function createCSVSource(
  file: Express.Multer.File,
  deps: SourceCreationDeps,
): Promise<Source> {
  const fileData = fs.readFileSync(file.path, 'utf8');
  const { headers, data } = parseCSV(fileData);
  const command = new CreateCSVDataSourceCommand({
    name: file.originalname,
    data: { headers, rows: data },
  });
  return deps.createDataSource(command);
}

async function createSpreadsheetSources(
  file: Express.Multer.File,
  deps: SourceCreationDeps,
): Promise<Source[]> {
  const fileData = fs.readFileSync(file.path);
  const sheets = parseExcel(fileData);

  if (sheets.length === 0) {
    deps.throwEmptyFileError(file.originalname);
  }

  const baseFileName = file.originalname.replace(/\.(xlsx|xls)$/i, '');
  const sources: Source[] = [];

  for (const sheet of sheets) {
    const sourceName =
      sheets.length === 1
        ? `${baseFileName}.csv`
        : `${baseFileName}_${sheet.sheetName.replace(/\s+/g, '_')}.csv`;

    const command = new CreateCSVDataSourceCommand({
      name: sourceName,
      data: { headers: sheet.headers, rows: sheet.rows },
    });
    sources.push(await deps.createDataSource(command));
  }

  return sources;
}
