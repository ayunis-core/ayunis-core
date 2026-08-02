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
import type { DataSourceFileKind } from 'src/domain/sources/domain/data-source-file-kind.type';
import { StartDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.use-case';
import { StartDocumentProcessingCommand } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.command';
import { StartDataSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/start-data-source-processing/start-data-source-processing.use-case';
import { StartDataSourceProcessingCommand } from 'src/domain/sources/application/use-cases/start-data-source-processing/start-data-source-processing.command';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import {
  UnsupportedFileTypeError,
  UnsupportedSourceFileTypeError,
} from 'src/domain/sources/application/sources.errors';
import { Thread } from '../../../domain/thread.entity';
import { UnexpecteThreadError } from '../../threads.errors';
import { assertThreadHasSourceCapacity } from '../../util/thread-source-capacity';
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
    private readonly startDataSourceProcessingUseCase: StartDataSourceProcessingUseCase,
    private readonly deleteSourcesUseCase: DeleteSourcesUseCase,
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

    // Processing uploads to object storage and enqueues a job, neither of
    // which the attach below can undo cheaply — so the cap is checked first,
    // on the already-loaded thread. AddSourceToThreadUseCase re-checks it
    // against a fresh thread inside a transaction and stays authoritative
    // for concurrent adds.
    assertThreadHasSourceCapacity(thread.sourceAssignments ?? []);

    if (
      isDocumentFile(detectedType) ||
      isPlainTextFile(detectedType) ||
      isAudioFile(detectedType)
    ) {
      return this.addDocumentSource(thread, command.file, detectedType);
    }
    if (isCSVFile(detectedType) || isSpreadsheetFile(detectedType)) {
      return this.addDataSources(
        thread,
        command.file,
        isCSVFile(detectedType) ? 'csv' : 'spreadsheet',
      );
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
    await this.attachOrCompensate(thread, [source]);
    return [source];
  }

  private async addDataSources(
    thread: Thread,
    file: UploadedFileRef,
    kind: DataSourceFileKind,
  ): Promise<Source[]> {
    const sources = await this.startDataSourceProcessingUseCase.execute(
      new StartDataSourceProcessingCommand({
        fileData: await fs.promises.readFile(file.path),
        fileName: file.originalname,
        kind,
        // A workbook creates one source per data sheet; re-check the cap with
        // the real count so an oversized upload is rejected before any
        // sources, storage objects, or jobs exist.
        ensureCapacityFor: (sourceCount) =>
          assertThreadHasSourceCapacity(
            thread.sourceAssignments ?? [],
            sourceCount,
          ),
      }),
    );
    await this.attachOrCompensate(thread, sources);
    return sources;
  }

  // Processing has already started when attaching fails, so the pre-created
  // sources must be deleted or they survive as untracked orphans.
  private async attachOrCompensate(
    thread: Thread,
    sources: Source[],
  ): Promise<void> {
    try {
      await this.attachSources(thread, sources);
    } catch (error) {
      try {
        await this.deleteSourcesUseCase.execute(
          new DeleteSourcesCommand(sources.map((source) => source.id)),
        );
      } catch (cleanupError) {
        this.logger.error('Failed to delete sources after attach failure', {
          sourceIds: sources.map((source) => source.id),
          error: cleanupError as Error,
        });
      }
      throw error;
    }
  }

  @Transactional()
  private async attachSources(
    thread: Thread,
    sources: Source[],
  ): Promise<void> {
    for (const source of sources) {
      await this.addSourceToThreadUseCase.execute(
        new AddSourceCommand(thread, source),
      );
    }
  }
}
