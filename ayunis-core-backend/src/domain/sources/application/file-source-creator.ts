import * as fs from 'fs';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { CreateFileSourceCommand } from 'src/domain/sources/application/use-cases/create-text-source/create-text-source.command';
import { CreateCSVDataSourceCommand } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.command';
import type { DetectedFileType } from 'src/common/util/file-type';
import {
  detectFileType,
  getCanonicalMimeType,
  isDocumentFile,
  isPlainTextFile,
  isSpreadsheetFile,
  isCSVFile,
} from 'src/common/util/file-type';
import { parseCSV } from 'src/common/util/csv';
import { parseExcel } from 'src/common/util/excel';
import type { CreateTextSourceUseCase } from 'src/domain/sources/application/use-cases/create-text-source/create-text-source.use-case';
import type { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import type { PreflightCheckUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/preflight-check/preflight-check.use-case';
import { PreflightCheckCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/preflight-check/preflight-check.command';

export interface SourceCreationDeps {
  createTextSource: (command: CreateFileSourceCommand) => Promise<Source>;
  createDataSource: (command: CreateCSVDataSourceCommand) => Promise<Source>;
  throwEmptyFileError: (fileName: string) => never;
  throwUnsupportedTypeError: (type: string) => never;
  preflightCheck?: (
    fileData: Buffer,
    fileName: string,
    fileType: string,
  ) => Promise<void>;
}

const SUPPORTED_FILE_TYPES = [
  'PDF',
  'DOCX',
  'PPTX',
  'TXT',
  'CSV',
  'XLSX',
  'XLS',
];

export function buildSourceCreationDeps(params: {
  createTextSourceUseCase: CreateTextSourceUseCase;
  createDataSourceUseCase: CreateDataSourceUseCase;
  preflightCheckUseCase: PreflightCheckUseCase | null;
  EmptyFileDataError: new (fileName: string) => Error;
  UnsupportedFileTypeError: new (
    type: string,
    supportedTypes: string[],
  ) => Error;
}): SourceCreationDeps {
  return {
    createTextSource: (cmd) => params.createTextSourceUseCase.execute(cmd),
    createDataSource: (cmd) => params.createDataSourceUseCase.execute(cmd),
    throwEmptyFileError: (fileName: string) => {
      throw new params.EmptyFileDataError(fileName);
    },
    throwUnsupportedTypeError: (type: string) => {
      throw new params.UnsupportedFileTypeError(type, SUPPORTED_FILE_TYPES);
    },
    preflightCheck: params.preflightCheckUseCase
      ? (fileData, fileName, fileType) =>
          params.preflightCheckUseCase!.execute(
            new PreflightCheckCommand({ fileData, fileName, fileType }),
          )
      : undefined,
  };
}

export async function createSourcesFromFile(
  file: Express.Multer.File,
  deps: SourceCreationDeps,
): Promise<Source[]> {
  const detectedType = detectFileType(file.mimetype, file.originalname);

  if (isDocumentFile(detectedType) || isPlainTextFile(detectedType)) {
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

  if (deps.preflightCheck) {
    await deps.preflightCheck(fileData, file.originalname, file.mimetype);
  }

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
