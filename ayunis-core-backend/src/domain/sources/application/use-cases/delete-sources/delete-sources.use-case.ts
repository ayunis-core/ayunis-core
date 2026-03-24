import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { SourceRepository } from '../../ports/source.repository';
import { DocumentProcessingPort } from '../../ports/document-processing.port';
import { DeleteSourcesCommand } from './delete-sources.command';
import { ListObjectsUseCase } from 'src/domain/storage/application/use-cases/list-objects/list-objects.use-case';
import { ListObjectsCommand } from 'src/domain/storage/application/use-cases/list-objects/list-objects.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { ContextService } from 'src/common/context/services/context.service';
import { SourceStatus } from '../../../domain/source-status.enum';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedSourceError } from '../../sources.errors';
import { Transactional } from '@nestjs-cls/transactional';
import { IndexRegistry } from 'src/domain/rag/indexers/application/indexer.registry';

@Injectable()
export class DeleteSourcesUseCase {
  private readonly logger = new Logger(DeleteSourcesUseCase.name);

  constructor(
    private readonly indexRegistry: IndexRegistry,
    private readonly sourceRepository: SourceRepository,
    private readonly documentProcessingPort: DocumentProcessingPort,
    private readonly listObjectsUseCase: ListObjectsUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  async execute(command: DeleteSourcesCommand): Promise<void> {
    if (command.sourceIds.length === 0) {
      return;
    }

    this.logger.debug(`Deleting ${command.sourceIds.length} sources`);
    try {
      // Cancel jobs and clean MinIO for any processing sources
      await this.cancelProcessingSources(command.sourceIds);

      // Batch delete indexed content from all indices
      const indices = this.indexRegistry.getAll();
      for (const index of indices) {
        await index.deleteMany(command.sourceIds);
      }

      // Batch delete sources
      await this.sourceRepository.deleteMany(command.sourceIds);

      this.logger.debug(
        `Successfully deleted ${command.sourceIds.length} sources and their indexed content`,
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error deleting sources', {
        error: error as Error,
      });
      throw new UnexpectedSourceError('Error deleting sources', {
        error: error as Error,
      });
    }
  }

  private async cancelProcessingSources(sourceIds: UUID[]): Promise<void> {
    const sources = await this.sourceRepository.findByIds(sourceIds);
    const processing = sources.filter(
      (s) => s.status === SourceStatus.PROCESSING,
    );
    for (const source of processing) {
      try {
        await this.documentProcessingPort.cancelJob(source.id);
      } catch (err) {
        this.logger.warn('Failed to cancel processing job', {
          sourceId: source.id,
          error: err as Error,
        });
      }
      await this.cleanupProcessingFiles(source.id);
    }
  }

  private async cleanupProcessingFiles(sourceId: UUID): Promise<void> {
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
