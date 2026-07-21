import * as fs from 'fs';
import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  detectFileType,
  getCanonicalMimeType,
  isAudioFile,
  isDocumentFile,
  isPlainTextFile,
  isSpreadsheetFile,
  isCSVFile,
  SUPPORTED_FILE_TYPES,
  type DetectedFileType,
} from 'src/common/util/file-type';
import type { UploadedFileRef } from 'src/common/util/source-file-upload';
import { Source } from 'src/domain/sources/domain/source.entity';
import { StartDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.use-case';
import { StartDocumentProcessingCommand } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.command';
import { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import type { CreateCSVDataSourceCommand } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.command';
import { DataSourceCommandBuilderService } from 'src/domain/sources/application/services/data-source-command-builder.service';
import {
  UnsupportedFileTypeError,
  UnsupportedSourceFileTypeError,
  EmptyFileDataError,
} from 'src/domain/sources/application/sources.errors';
import { Thread } from '../../../domain/thread.entity';
import { UnexpecteThreadError } from '../../threads.errors';
import { FindThreadUseCase } from '../find-thread/find-thread.use-case';
import { FindThreadQuery } from '../find-thread/find-thread.query';
import { AddSourceToThreadUseCase } from '../add-source-to-thread/add-source-to-thread.use-case';
import { AddSourceCommand } from '../add-source-to-thread/add-source.command';
import { AddFileSourceToThreadCommand } from './add-file-source-to-thread.command';

@Injectable()
export class AddFileSourceToThreadUseCase {
  private readonly logger = new Logger(AddFileSourceToThreadUseCase.name);

  constructor(
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly addSourceToThreadUseCase: AddSourceToThreadUseCase,
    private readonly startDocumentProcessingUseCase: StartDocumentProcessingUseCase,
    private readonly createDataSourceUseCase: CreateDataSourceUseCase,
    private readonly dataSourceCommandBuilder: DataSourceCommandBuilderService,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(command: AddFileSourceToThreadCommand): Promise<Source[]> {
    this.logger.log('addFileSourceToThread', {
      threadId: command.threadId,
      fileName: command.file.originalname,
    });

    const detectedType = detectFileType(
      command.file.mimetype,
      command.file.originalname,
    );
    const { thread } = await this.findThreadUseCase.execute(
      new FindThreadQuery(command.threadId),
    );

    if (
      isDocumentFile(detectedType) ||
      isPlainTextFile(detectedType) ||
      isAudioFile(detectedType)
    ) {
      return this.addDocumentSource(thread, command.file, detectedType);
    }
    if (isCSVFile(detectedType)) {
      return this.addCsvSource(thread, command.file);
    }
    if (isSpreadsheetFile(detectedType)) {
      return this.addSpreadsheetSources(thread, command.file);
    }
    throw new UnsupportedFileTypeError(
      detectedType === 'unknown' ? command.file.originalname : detectedType,
      SUPPORTED_FILE_TYPES,
    );
  }

  private async addDocumentSource(
    thread: Thread,
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
    await this.addSourceToThreadUseCase.execute(
      new AddSourceCommand(thread, source),
    );
    return [source];
  }

  private async addCsvSource(
    thread: Thread,
    file: UploadedFileRef,
  ): Promise<Source[]> {
    const csvCommand =
      await this.dataSourceCommandBuilder.buildCsvSourceCommand(file);
    return this.createAndAttachSources(thread, [csvCommand]);
  }

  private async addSpreadsheetSources(
    thread: Thread,
    file: UploadedFileRef,
  ): Promise<Source[]> {
    const commands =
      await this.dataSourceCommandBuilder.buildSpreadsheetSourceCommands(file);
    if (commands.length === 0) {
      throw new EmptyFileDataError(file.originalname);
    }
    return this.createAndAttachSources(thread, commands);
  }

  @Transactional()
  private async createAndAttachSources(
    thread: Thread,
    commands: CreateCSVDataSourceCommand[],
  ): Promise<Source[]> {
    const sources: Source[] = [];
    for (const csvCommand of commands) {
      const source = await this.createDataSourceUseCase.execute(csvCommand);
      await this.addSourceToThreadUseCase.execute(
        new AddSourceCommand(thread, source),
      );
      sources.push(source);
    }
    return sources;
  }
}
