import type { UUID } from 'crypto';
import * as fs from 'fs';
import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { buildMinioProcessingPath } from 'src/domain/sources/application/util/minio-processing-file.helpers';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import type { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { CreateProcessingSourceUseCase } from 'src/domain/sources/application/use-cases/create-processing-source/create-processing-source.use-case';
import { CreateProcessingSourceCommand } from 'src/domain/sources/application/use-cases/create-processing-source/create-processing-source.command';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { MarkSourceFailedCommand } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.command';
import { EnqueueDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/enqueue-document-processing/enqueue-document-processing.use-case';
import { EnqueueDocumentProcessingCommand } from 'src/domain/sources/application/use-cases/enqueue-document-processing/enqueue-document-processing.command';
import { UploadOrgObjectUseCase } from 'src/domain/storage/application/use-cases/upload-org-object/upload-org-object.use-case';
import { UploadOrgObjectCommand } from 'src/domain/storage/application/use-cases/upload-org-object/upload-org-object.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { GetPermittedEmbeddingModelQuery } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.query';
import { PreflightCheckUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/preflight-check/preflight-check.use-case';
import { PreflightCheckCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/preflight-check/preflight-check.command';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { classifySourceProcessingError } from 'src/domain/sources/application/services/classify-source-processing-error';
import { detectFileType } from 'src/common/util/file-type';
import { StageStopwatch } from 'src/domain/sources/application/util/stage-stopwatch';
import { createSha256ReadStream } from 'src/common/util/sha256-read-stream';
import {
  recordDocumentProcessingStages,
  type DocumentProcessingStage,
} from 'src/domain/sources/application/util/document-processing-metrics.helper';
import { StartDocumentProcessingCommand } from './start-document-processing.command';

interface StagedUpload {
  sha256: string;
  sizeBytes: number;
}

@Injectable()
export class StartDocumentProcessingUseCase {
  private readonly logger = new Logger(StartDocumentProcessingUseCase.name);

  constructor(
    private readonly createProcessingSourceUseCase: CreateProcessingSourceUseCase,
    private readonly markSourceFailedUseCase: MarkSourceFailedUseCase,
    private readonly uploadOrgObjectUseCase: UploadOrgObjectUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly enqueueDocumentProcessingUseCase: EnqueueDocumentProcessingUseCase,
    private readonly getPermittedEmbeddingModelUseCase: GetPermittedEmbeddingModelUseCase,
    private readonly preflightCheckUseCase: PreflightCheckUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: StartDocumentProcessingCommand): Promise<FileSource> {
    const { fileName } = command;
    this.logger.log({ fileName }, 'Starting async document processing');

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) throw new Error('orgId is required');
      const userId = this.contextService.get('userId');
      if (!userId) throw new Error('userId is required');

      return await this.start(command, orgId, userId);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
        },
        'Error starting document processing',
      );
      throw new UnexpectedSourceError('Error starting document processing', {
        error: error as Error,
      });
    }
  }

  private async start(
    command: StartDocumentProcessingCommand,
    orgId: UUID,
    userId: UUID,
  ): Promise<FileSource> {
    const timings = new StageStopwatch<DocumentProcessingStage>();

    // Indexing resolves the org's embedding model only inside the worker,
    // after the (expensive) OCR step — reject here so an unprovisioned org
    // fails fast with a clear error instead of a doomed processing job.
    await this.getPermittedEmbeddingModelUseCase.execute(
      new GetPermittedEmbeddingModelQuery({ orgId }),
    );

    // OCR would reject an oversized PDF only after the upload round trip —
    // check the page cap here so it fails before any processing starts.
    await timings.measure('preflight', () => this.preflight(command));

    const savedSource = await this.createProcessingSourceUseCase.execute(
      new CreateProcessingSourceCommand({
        fileType: command.fileType,
        fileName: command.fileName,
      }),
    );
    this.contextService.set('sourceId', savedSource.id);

    // Upload holds no transaction; enqueue takes its own short lifecycle lock.
    const minioPath = buildMinioProcessingPath(
      orgId,
      savedSource.id,
      command.fileName,
    );
    const upload = await timings.measure('upload', () =>
      this.uploadFileOrFail(savedSource, minioPath, command, orgId),
    );
    await this.enqueueOrFail(
      savedSource,
      minioPath,
      new EnqueueDocumentProcessingCommand({
        sourceId: savedSource.id,
        orgId,
        userId,
        minioPath,
        sha256: upload.sha256,
        fileName: command.fileName,
        fileType: command.fileType,
      }),
    );
    this.reportAccepted(command, savedSource, timings, upload);

    return savedSource;
  }

  /** Only a PDF is parsed for its page count, so only a PDF is read into memory here. */
  private async preflight(
    command: StartDocumentProcessingCommand,
  ): Promise<void> {
    if (detectFileType(command.fileType, command.fileName) !== 'pdf') return;
    await this.preflightCheckUseCase.execute(
      new PreflightCheckCommand({
        fileData: await fs.promises.readFile(command.filePath),
        fileName: command.fileName,
        fileType: command.fileType,
      }),
    );
  }

  private reportAccepted(
    command: StartDocumentProcessingCommand,
    source: FileSource,
    timings: StageStopwatch<DocumentProcessingStage>,
    upload: StagedUpload,
  ): void {
    const fileType = detectFileType(command.fileType, command.fileName);
    this.logger.log(
      {
        sourceId: source.id,
        fileType,
        fileSizeBytes: upload.sizeBytes,
        ...timings.report(),
      },
      'Document accepted for processing',
    );
    recordDocumentProcessingStages(timings.values(), fileType);
  }

  /** Streams the file into MinIO and hashes it on the way (contract §5). */
  private async uploadFileOrFail(
    source: FileSource,
    minioPath: string,
    command: StartDocumentProcessingCommand,
    orgId: UUID,
  ): Promise<StagedUpload> {
    const { size } = await fs.promises.stat(command.filePath);
    const hashed = createSha256ReadStream(command.filePath);
    try {
      await this.uploadOrgObjectUseCase.execute(
        new UploadOrgObjectCommand(
          orgId,
          minioPath,
          hashed.stream,
          undefined,
          undefined,
          size,
        ),
      );
      return { sha256: hashed.digest(), sizeBytes: size };
    } catch (error) {
      // An upload rejected before storage read anything leaves the file
      // open otherwise.
      hashed.stream.destroy();
      await this.tryMarkSourceFailed(
        source,
        'Failed to upload file to storage',
        classifySourceProcessingError(error),
      );
      throw error;
    }
  }

  private async enqueueOrFail(
    source: FileSource,
    minioPath: string,
    job: EnqueueDocumentProcessingCommand,
  ): Promise<void> {
    try {
      await this.enqueueDocumentProcessingUseCase.execute(job);
    } catch (error) {
      this.logger.error(
        {
          sourceId: source.id,
          err: error as Error,
        },
        'Failed to enqueue document processing job',
      );
      await this.tryMarkSourceFailed(
        source,
        'Failed to enqueue processing job',
      );
      await this.cleanupMinioFile(minioPath);
      throw error;
    }
  }

  private async cleanupMinioFile(minioPath: string): Promise<void> {
    try {
      await this.deleteObjectUseCase.execute(
        new DeleteObjectCommand(minioPath),
      );
    } catch (err) {
      this.logger.warn(
        {
          fileName: minioPath,
          err: err as Error,
        },
        'Failed to clean up MinIO processing file',
      );
    }
  }

  private async tryMarkSourceFailed(
    source: FileSource,
    errorMessage: string,
    errorCode?: SourceProcessingErrorCode,
  ): Promise<void> {
    try {
      await this.markSourceFailedUseCase.execute(
        new MarkSourceFailedCommand({
          sourceId: source.id,
          errorMessage,
          errorCode,
        }),
      );
    } catch (err) {
      this.logger.error(
        {
          sourceId: source.id,
          err: err as Error,
        },
        'Failed to mark source as FAILED',
      );
    }
  }
}
