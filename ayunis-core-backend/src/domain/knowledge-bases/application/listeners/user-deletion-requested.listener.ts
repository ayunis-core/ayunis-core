import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { UserDeletionRequestedEvent } from 'src/iam/users/application/events/user-deletion-requested.event';
import { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import { CleanupSourceProcessingCommand } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.command';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';

/**
 * Snapshots sources owned through a user's personal and workspace knowledge
 * bases before the database cascade removes them. Processing cleanup and index
 * deletion are deferred until the user row has been deleted successfully.
 * Failures are logged and never block user deletion.
 */
@Injectable()
export class KnowledgeBasesUserDeletionRequestedListener {
  private readonly logger = new Logger(
    KnowledgeBasesUserDeletionRequestedListener.name,
  );

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly cleanupSourceProcessingUseCase: CleanupSourceProcessingUseCase,
    private readonly deleteSourcesUseCase: DeleteSourcesUseCase,
  ) {}

  @OnEvent(UserDeletionRequestedEvent.EVENT_NAME)
  async handleUserDeletionRequested(
    event: UserDeletionRequestedEvent,
  ): Promise<void> {
    try {
      const knowledgeBases =
        await this.knowledgeBaseRepository.findAllOwnedByUserId(event.userId);

      if (knowledgeBases.length === 0) {
        return;
      }

      const sources =
        await this.knowledgeBaseRepository.findSourcesByKnowledgeBaseIds(
          knowledgeBases.map((knowledgeBase) => knowledgeBase.id),
        );
      if (sources.length === 0) {
        return;
      }

      const sourceIds = sources.map((source) => source.id);
      const processingSourceIds = sources
        .filter((source) => source.status === SourceStatus.PROCESSING)
        .map((source) => source.id);

      this.logger.log(
        {
          userId: event.userId,
          knowledgeBaseCount: knowledgeBases.length,
          sourceCount: sourceIds.length,
        },
        'Deferring knowledge base source cleanup for deleted user',
      );

      this.deferSourceCleanup(event, sourceIds, processingSourceIds);
    } catch (error) {
      this.logger.error(
        {
          userId: event.userId,
          err: error as Error,
        },
        'Failed to resolve knowledge base sources for deleted user',
      );
    }
  }

  private deferSourceCleanup(
    event: UserDeletionRequestedEvent,
    sourceIds: UUID[],
    processingSourceIds: UUID[],
  ): void {
    if (processingSourceIds.length > 0) {
      event.deferCleanup('cleanup knowledge base source processing', () =>
        this.cleanupSourceProcessingUseCase.execute(
          new CleanupSourceProcessingCommand(processingSourceIds, event.orgId),
        ),
      );
    }
    event.deferCleanup('delete knowledge base source indexes', () =>
      this.deleteSourcesUseCase.execute(
        new DeleteSourcesCommand(sourceIds, event.orgId),
      ),
    );
  }
}
