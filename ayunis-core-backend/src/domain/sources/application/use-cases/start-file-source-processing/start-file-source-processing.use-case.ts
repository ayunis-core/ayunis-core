import * as fs from 'fs';
import { Injectable, Logger } from '@nestjs/common';
import {
  detectFileType,
  getCanonicalMimeType,
  isAudioFile,
  isCSVFile,
  isDocumentFile,
  isPlainTextFile,
  isSpreadsheetFile,
  SUPPORTED_FILE_TYPES,
  type DetectedFileType,
} from 'src/common/util/file-type';
import {
  MAX_TABULAR_FILE_SIZE_BYTES,
  type UploadedFileRef,
} from 'src/common/util/source-file-upload';
import { Source } from '../../../domain/source.entity';
import { StartDocumentProcessingUseCase } from '../start-document-processing/start-document-processing.use-case';
import { StartDocumentProcessingCommand } from '../start-document-processing/start-document-processing.command';
import { StartDataSourceProcessingUseCase } from '../start-data-source-processing/start-data-source-processing.use-case';
import { StartDataSourceProcessingCommand } from '../start-data-source-processing/start-data-source-processing.command';
import {
  TabularFileTooLargeError,
  UnsupportedFileTypeError,
  UnsupportedSourceFileTypeError,
} from '../../sources.errors';
import { StartFileSourceProcessingCommand } from './start-file-source-processing.command';

/**
 * Type-dispatching entry point for uploaded files, shared by the thread and
 * skill upload flows: documents/audio go to the document pipeline, tabular
 * files to the data-source pipeline. Returns the created PROCESSING sources;
 * attaching them is the caller's job.
 */
@Injectable()
export class StartFileSourceProcessingUseCase {
  private readonly logger = new Logger(StartFileSourceProcessingUseCase.name);

  constructor(
    private readonly startDocumentProcessingUseCase: StartDocumentProcessingUseCase,
    private readonly startDataSourceProcessingUseCase: StartDataSourceProcessingUseCase,
  ) {}

  async execute(command: StartFileSourceProcessingCommand): Promise<Source[]> {
    const { file } = command;
    this.logger.log('startFileSourceProcessing', {
      fileName: file.originalname,
    });

    const detectedType = detectFileType(file.mimetype, file.originalname);

    if (
      isDocumentFile(detectedType) ||
      isPlainTextFile(detectedType) ||
      isAudioFile(detectedType)
    ) {
      return this.startDocument(file, detectedType);
    }
    if (isCSVFile(detectedType) || isSpreadsheetFile(detectedType)) {
      return this.startTabular(
        file,
        isCSVFile(detectedType),
        command.ensureCapacityFor,
      );
    }
    throw new UnsupportedFileTypeError(
      detectedType === 'unknown' ? file.originalname : detectedType,
      SUPPORTED_FILE_TYPES,
    );
  }

  private async startDocument(
    file: UploadedFileRef,
    detectedType: DetectedFileType,
  ): Promise<Source[]> {
    const canonicalMimeType = getCanonicalMimeType(detectedType);
    if (!canonicalMimeType) {
      throw new UnsupportedSourceFileTypeError(detectedType);
    }
    const source = await this.startDocumentProcessingUseCase.execute(
      new StartDocumentProcessingCommand({
        fileData: await fs.promises.readFile(file.path),
        fileName: file.originalname,
        fileType: canonicalMimeType,
      }),
    );
    return [source];
  }

  private async startTabular(
    file: UploadedFileRef,
    isCsv: boolean,
    ensureCapacityFor?: (sourceCount: number) => void,
  ): Promise<Source[]> {
    const fileData = await fs.promises.readFile(file.path);
    if (fileData.byteLength > MAX_TABULAR_FILE_SIZE_BYTES) {
      throw new TabularFileTooLargeError(
        file.originalname,
        MAX_TABULAR_FILE_SIZE_BYTES,
      );
    }
    return this.startDataSourceProcessingUseCase.execute(
      new StartDataSourceProcessingCommand({
        fileData,
        fileName: file.originalname,
        kind: isCsv ? 'csv' : 'spreadsheet',
        ensureCapacityFor,
      }),
    );
  }
}
