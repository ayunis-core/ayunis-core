import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { DeferredCleanupEvent } from 'src/common/events/deferred-cleanup.event';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { CleanupSourceProcessingCommand } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.command';
import { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';

/**
 * Knowledge bases, their sources and index chunks go with their owner by FK
 * cascade; only queued jobs and temporary processing files of sources still
 * being processed need cleanup after the delete.
 */
@Injectable()
export class KnowledgeBaseProcessingCleanupService {
  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly cleanupSourceProcessingUseCase: CleanupSourceProcessingUseCase,
  ) {}

  async deferProcessingCleanup(
    event: DeferredCleanupEvent,
    knowledgeBaseIds: UUID[],
    orgId: UUID,
    owner: string,
  ): Promise<void> {
    if (knowledgeBaseIds.length === 0) return;
    const sources =
      await this.repository.findSourcesByKnowledgeBaseIds(knowledgeBaseIds);
    const processingSourceIds = sources
      .filter((source) => source.status === SourceStatus.PROCESSING)
      .map((source) => source.id);
    if (processingSourceIds.length === 0) return;
    event.deferCleanup(`cleanup ${owner} source processing`, () =>
      this.cleanupSourceProcessingUseCase.execute(
        new CleanupSourceProcessingCommand(processingSourceIds, orgId),
      ),
    );
  }
}
