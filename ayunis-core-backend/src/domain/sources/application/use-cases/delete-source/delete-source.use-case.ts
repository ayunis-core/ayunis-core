import { Injectable, Logger } from '@nestjs/common';
import { SourceRepository } from '../../ports/source.repository';
import { DocumentProcessingPort } from '../../ports/document-processing.port';
import { DeleteSourceCommand } from './delete-source.command';
import { DeleteContentUseCase } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.use-case';
import { DeleteContentCommand } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.command';
import { ListObjectsUseCase } from 'src/domain/storage/application/use-cases/list-objects/list-objects.use-case';
import { ListObjectsCommand } from 'src/domain/storage/application/use-cases/list-objects/list-objects.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { ContextService } from 'src/common/context/services/context.service';
import { SourceStatus } from '../../../domain/source-status.enum';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedSourceError } from '../../sources.errors';
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class DeleteSourceUseCase {
  private readonly logger = new Logger(DeleteSourceUseCase.name);

  constructor(
    private readonly deleteContentUseCase: DeleteContentUseCase,
    private readonly sourceRepository: SourceRepository,
    private readonly documentProcessingPort: DocumentProcessingPort,
    private readonly listObjectsUseCase: ListObjectsUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  async execute(command: DeleteSourceCommand): Promise<void> {
    this.logger.debug(`Deleting source: ${command.sourceId}`);
    try {
      const source = await this.sourceRepository.findById(command.sourceId);

      if (source?.status === SourceStatus.PROCESSING) {
        await this.cancelJobAndCleanupMinio(command.sourceId);
      }

      // Delete indexed content first
      const deleteContentCommand = new DeleteContentCommand({
        documentId: command.sourceId,
      });

      await this.deleteContentUseCase.execute(deleteContentCommand);
      await this.sourceRepository.delete(command.sourceId);

      this.logger.debug(
        `Successfully deleted source and indexed content: ${command.sourceId}`,
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error deleting source', {
        error: error as Error,
      });
      throw new UnexpectedSourceError('Error deleting source', {
        error: error as Error,
      });
    }
  }

  private async cancelJobAndCleanupMinio(
    sourceId: DeleteSourceCommand['sourceId'],
  ): Promise<void> {
    try {
      await this.documentProcessingPort.cancelJob(sourceId);
    } catch (err) {
      this.logger.warn('Failed to cancel processing job', {
        sourceId,
        error: err as Error,
      });
    }
    await this.cleanupProcessingFiles(sourceId);
  }

  private async cleanupProcessingFiles(
    sourceId: DeleteSourceCommand['sourceId'],
  ): Promise<void> {
    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) return;
      const prefix = `${orgId}/processing/${sourceId}/`;
      const objects = await this.listObjectsUseCase.execute(
        new ListObjectsCommand(prefix),
      );
      for (const objectName of objects) {
        await this.deleteObjectUseCase.execute(
          new DeleteObjectCommand(objectName),
        );
      }
    } catch (err) {
      this.logger.warn('Failed to clean up MinIO processing files', {
        sourceId,
        error: err as Error,
      });
    }
  }
}
