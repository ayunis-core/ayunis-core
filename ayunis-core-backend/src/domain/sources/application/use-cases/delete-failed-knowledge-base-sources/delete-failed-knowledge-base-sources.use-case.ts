import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FailedSourcesDeletedEvent } from 'src/domain/sources/application/events/failed-sources-deleted.event';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { IndexRegistry } from 'src/domain/rag/indexers/application/indexer.registry';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { CleanupSourceProcessingCommand } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.command';
import { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { DeleteFailedKnowledgeBaseSourcesCommand } from './delete-failed-knowledge-base-sources.command';

@Injectable()
export class DeleteFailedKnowledgeBaseSourcesUseCase {
  private readonly logger = new Logger(
    DeleteFailedKnowledgeBaseSourcesUseCase.name,
  );

  constructor(
    private readonly indexRegistry: IndexRegistry,
    private readonly sourceRepository: SourceRepository,
    private readonly cleanupSourceProcessingUseCase: CleanupSourceProcessingUseCase,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Returns the ids of the deleted sources. */
  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(
    command: DeleteFailedKnowledgeBaseSourcesCommand,
  ): Promise<UUID[]> {
    this.logger.log(
      { knowledgeBaseId: command.knowledgeBaseId },
      'Deleting failed knowledge base sources',
    );
    // See DeleteSourceUseCase: inside a caller's transaction the commit
    // happens after this returns, so the originals are left to the nightly
    // unreferenced-originals sweep.
    const cleanupNow = !this.txHost.isTransactionActive();
    const deleted = await this.deleteRecords(command.knowledgeBaseId);
    const sourceIds = deleted.map(({ id }) => id);
    if (cleanupNow && deleted.length > 0) {
      await this.cleanupSourceProcessingUseCase.execute(
        new CleanupSourceProcessingCommand(
          sourceIds,
          command.orgId,
          deleted.flatMap(({ storageKey }) =>
            storageKey === null ? [] : [storageKey],
          ),
        ),
      );
    }
    return sourceIds;
  }

  @Transactional()
  private async deleteRecords(
    knowledgeBaseId: UUID,
  ): Promise<Pick<Source, 'id' | 'storageKey'>[]> {
    const deleted =
      await this.sourceRepository.deleteFailedByKnowledgeBaseId(
        knowledgeBaseId,
      );
    const sourceIds = deleted.map(({ id }) => id);
    if (sourceIds.length > 0) {
      for (const index of this.indexRegistry.getAll()) {
        await index.deleteMany(sourceIds);
      }
      await this.eventEmitter.emitAsync(
        FailedSourcesDeletedEvent.EVENT_NAME,
        new FailedSourcesDeletedEvent(sourceIds),
      );
    }
    return deleted;
  }
}
