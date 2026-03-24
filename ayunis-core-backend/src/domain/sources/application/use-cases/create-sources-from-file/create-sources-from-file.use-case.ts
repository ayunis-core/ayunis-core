import * as fs from 'fs';
import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import type { Source } from 'src/domain/sources/domain/source.entity';
import {
  detectFileType,
  getCanonicalMimeType,
  isDocumentFile,
  isPlainTextFile,
  isSpreadsheetFile,
  isCSVFile,
  type DetectedFileType,
} from 'src/common/util/file-type';
import { parseCSV } from 'src/common/util/csv';
import { parseExcel } from 'src/common/util/excel';
import { CreateTextSourceUseCase } from '../create-text-source/create-text-source.use-case';
import { CreateDataSourceUseCase } from '../create-data-source/create-data-source.use-case';
import { CreateFileSourceCommand } from '../create-text-source/create-text-source.command';
import { CreateCSVDataSourceCommand } from '../create-data-source/create-data-source.command';
import {
  EmptyFileDataError,
  UnsupportedFileTypeError,
  UnexpectedSourceError,
} from '../../sources.errors';
import { CreateSourcesFromFileCommand } from './create-sources-from-file.command';

const SUPPORTED_FILE_TYPES = [
  'PDF',
  'DOCX',
  'PPTX',
  'TXT',
  'CSV',
  'XLSX',
  'XLS',
];

@Injectable()
export class CreateSourcesFromFileUseCase {
  private readonly logger = new Logger(CreateSourcesFromFileUseCase.name);

  constructor(
    private readonly createTextSourceUseCase: CreateTextSourceUseCase,
    private readonly createDataSourceUseCase: CreateDataSourceUseCase,
  ) {}

  async execute(command: CreateSourcesFromFileCommand): Promise<Source[]> {
    this.logger.log('Creating sources from file', {
      fileName: command.originalName,
    });

    try {
      const detectedType = detectFileType(
        command.mimeType,
        command.originalName,
      );

      if (isDocumentFile(detectedType) || isPlainTextFile(detectedType)) {
        return [await this.createDocumentSource(command, detectedType)];
      }

      if (isCSVFile(detectedType)) {
        return [await this.createCSVSource(command)];
      }

      if (isSpreadsheetFile(detectedType)) {
        return this.createSpreadsheetSources(command);
      }

      throw new UnsupportedFileTypeError(
        detectedType === 'unknown' ? command.originalName : detectedType,
        SUPPORTED_FILE_TYPES,
      );
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error creating sources from file', {
        error: error as Error,
      });
      throw new UnexpectedSourceError('Error creating sources from file', {
        error: error as Error,
      });
    }
  }

  private async createDocumentSource(
    command: CreateSourcesFromFileCommand,
    detectedType: DetectedFileType,
  ): Promise<Source> {
    const fileData = fs.readFileSync(command.filePath);
    const canonicalMimeType = getCanonicalMimeType(detectedType);
    if (!canonicalMimeType) {
      throw new Error(
        `Unable to determine MIME type for detected file type: ${detectedType}`,
      );
    }
    return this.createTextSourceUseCase.execute(
      new CreateFileSourceCommand({
        fileType: canonicalMimeType,
        fileData,
        fileName: command.originalName,
      }),
    );
  }

  private async createCSVSource(
    command: CreateSourcesFromFileCommand,
  ): Promise<Source> {
    const fileData = fs.readFileSync(command.filePath, 'utf8');
    const parsed = parseCSV(fileData);
    return this.createDataSourceUseCase.execute(
      new CreateCSVDataSourceCommand({
        name: command.originalName,
        data: { headers: parsed.headers, rows: parsed.data },
      }),
    );
  }

  private async createSpreadsheetSources(
    command: CreateSourcesFromFileCommand,
  ): Promise<Source[]> {
    const fileData = fs.readFileSync(command.filePath);
    const sheets = parseExcel(fileData);

    if (sheets.length === 0) {
      throw new EmptyFileDataError(command.originalName);
    }

    const baseFileName = command.originalName.replace(/\.(xlsx|xls)$/i, '');
    const sources: Source[] = [];

    for (const sheet of sheets) {
      const sourceName =
        sheets.length === 1
          ? `${baseFileName}.csv`
          : `${baseFileName}_${sheet.sheetName.replace(/\s+/g, '_')}.csv`;

      const source = await this.createDataSourceUseCase.execute(
        new CreateCSVDataSourceCommand({
          name: sourceName,
          data: { headers: sheet.headers, rows: sheet.rows },
        }),
      );
      sources.push(source);
    }

    return sources;
  }
}
