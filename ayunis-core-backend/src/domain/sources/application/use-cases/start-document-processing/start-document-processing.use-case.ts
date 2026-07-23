import * as path from 'path';
import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { CreateProcessingSourceUseCase } from 'src/domain/sources/application/use-cases/create-processing-source/create-processing-source.use-case';
import { CreateProcessingSourceCommand } from 'src/domain/sources/application/use-cases/create-processing-source/create-processing-source.command';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { MarkSourceFailedCommand } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.command';
import { EnqueueDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/enqueue-document-processing/enqueue-document-processing.use-case';
import { EnqueueDocumentProcessingCommand } from 'src/domain/sources/application/use-cases/enqueue-document-processing/enqueue-document-processing.command';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { UploadObjectCommand } from 'src/domain/storage/application/use-cases/upload-object/upload-object.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { GetPermittedEmbeddingModelQuery } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.query';
import { PreflightCheckUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/preflight-check/preflight-check.use-case';
import { PreflightCheckCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/preflight-check/preflight-check.command';
import { UnexpectedSourceError } from '../../sources.errors';
import { StartDocumentProcessingCommand } from './start-document-processing.command';

@Injectable()
export class StartDocumentProcessingUseCase {
  private readonly logger = new Logger(StartDocumentProcessingUseCase.name);

  constructor(
    private readonly createProcessingSourceUseCase: CreateProcessingSourceUseCase,
    private readonly markSourceFailedUseCase: MarkSourceFailedUseCase,
    private readonly uploadObjectUseCase: UploadObjectUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly enqueueDocumentProcessingUseCase: EnqueueDocumentProcessingUseCase,
    private readonly getPermittedEmbeddingModelUseCase: GetPermittedEmbeddingModelUseCase,
    private readonly preflightCheckUseCase: PreflightCheckUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: StartDocumentProcessingCommand): Promise<FileSource> {
    this.logger.log('Starting async document processing', {
      fileName: command.fileName,
    });

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new Error('orgId is required');
      }
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new Error('userId is required');
      }

      // Indexing resolves the org's embedding model only inside the worker,
      // after the (expensive) OCR step — reject here so an unprovisioned org
      // fails fast with a clear error instead of a doomed processing job.
      await this.getPermittedEmbeddingModelUseCase.execute(
        new GetPermittedEmbeddingModelQuery({ orgId }),
      );

      // OCR would reject an oversized PDF only after the upload round trip —
      // check the page cap here so it fails before any processing starts.
      await this.preflightCheckUseCase.execute(
        new PreflightCheckCommand({
          fileData: command.fileData,
          fileName: command.fileName,
          fileType: command.fileType,
        }),
      );

      const savedSource = await this.createProcessingSourceUseCase.execute(
        new CreateProcessingSourceCommand({
          fileType: command.fileType,
          fileName: command.fileName,
        }),
      );

      // Upload and enqueue both happen outside the transaction
      const minioPath = this.buildMinioPath(orgId, savedSource.id, command);
      await this.uploadFileOrFail(savedSource, minioPath, command);
      await this.enqueueOrFail(savedSource, minioPath, orgId, userId, command);

      return savedSource;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error starting document processing', {
        error: error as Error,
      });
      throw new UnexpectedSourceError('Error starting document processing', {
        error: error as Error,
      });
    }
  }

  private buildMinioPath(
    orgId: string,
    sourceId: string,
    command: StartDocumentProcessingCommand,
  ): string {
    const sanitizedFileName = path
      .basename(command.fileName)
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${orgId}/processing/${sourceId}/${sanitizedFileName}`;
  }

  private async uploadFileOrFail(
    source: FileSource,
    minioPath: string,
    command: StartDocumentProcessingCommand,
  ): Promise<void> {
    try {
      await this.uploadObjectUseCase.execute(
        new UploadObjectCommand(minioPath, command.fileData),
      );
    } catch (error) {
      await this.tryMarkSourceFailed(
        source,
        'Failed to upload file to storage',
      );
      throw error;
    }
  }

  private async enqueueOrFail(
    source: FileSource,
    minioPath: string,
    orgId: UUID,
    userId: UUID,
    command: StartDocumentProcessingCommand,
  ): Promise<void> {
    try {
      await this.enqueueDocumentProcessingUseCase.execute(
        new EnqueueDocumentProcessingCommand({
          sourceId: source.id,
          orgId,
          userId,
          minioPath,
          fileName: command.fileName,
          fileType: command.fileType,
        }),
      );
    } catch (error) {
      this.logger.error('Failed to enqueue document processing job', {
        sourceId: source.id,
        error: error as Error,
      });
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
      this.logger.warn('Failed to clean up MinIO processing file', {
        minioPath,
        error: err as Error,
      });
    }
  }

  private async tryMarkSourceFailed(
    source: FileSource,
    errorMessage: string,
  ): Promise<void> {
    try {
      await this.markSourceFailedUseCase.execute(
        new MarkSourceFailedCommand({
          sourceId: source.id,
          errorMessage,
        }),
      );
    } catch (err) {
      this.logger.error('Failed to mark source as FAILED', {
        sourceId: source.id,
        error: err as Error,
      });
    }
  }
}
