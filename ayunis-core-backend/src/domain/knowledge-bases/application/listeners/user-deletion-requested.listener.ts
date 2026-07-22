import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { UserDeletionRequestedEvent } from 'src/iam/users/application/events/user-deletion-requested.event';
import { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import { CleanupSourceProcessingCommand } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.command';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { KnowledgeBaseRepository } from '../ports/knowledge-base.repository';

/**
 * Cleans up in-flight source processing for a user's knowledge bases when the
 * user is being deleted.
 *
 * The rows need no handling here: `knowledge_bases.userId`,
 * `sources.knowledgeBaseId` and the RAG parent/child chunks all cascade on
 * user deletion (see the CascadeUserDeletionRelations,
 * AddOrgCascadeToConversationKbMcpData and AddParentChunksSourceFk
 * migrations). What the cascade cannot do is cancel queued processing jobs and
 * remove `<orgId>/processing/<sourceId>/` MinIO blobs — so this listener
 * resolves the processing sources while the rows still exist and defers that
 * cleanup; the users module runs it after the row delete succeeds. Failures
 * are logged, never thrown, so cleanup issues never block deletion.
 */
@Injectable()
export class KnowledgeBasesUserDeletionRequestedListener {
  private readonly logger = new Logger(
    KnowledgeBasesUserDeletionRequestedListener.name,
  );

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly cleanupSourceProcessingUseCase: CleanupSourceProcessingUseCase,
  ) {}

  @OnEvent(UserDeletionRequestedEvent.EVENT_NAME)
  async handleUserDeletionRequested(
    event: UserDeletionRequestedEvent,
  ): Promise<void> {
    try {
      const knowledgeBases = await this.knowledgeBaseRepository.findAllByUserId(
        event.userId,
      );

      if (knowledgeBases.length === 0) {
        return;
      }

      const sourceIds = await this.collectProcessingSourceIds(
        knowledgeBases.map((kb) => kb.id),
      );

      if (sourceIds.length === 0) {
        return;
      }

      this.logger.log('Deferring source processing cleanup for deleted user', {
        userId: event.userId,
        knowledgeBaseCount: knowledgeBases.length,
        sourceCount: sourceIds.length,
      });

      event.deferCleanup('cleanup knowledge base source processing', () =>
        this.cleanupSourceProcessingUseCase.execute(
          new CleanupSourceProcessingCommand(sourceIds, event.orgId),
        ),
      );
    } catch (error) {
      this.logger.error(
        'Failed to resolve knowledge base sources for deleted user',
        {
          userId: event.userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
    }
  }

  private async collectProcessingSourceIds(
    knowledgeBaseIds: UUID[],
  ): Promise<UUID[]> {
    const sourceIds: UUID[] = [];
    for (const knowledgeBaseId of knowledgeBaseIds) {
      const sources =
        await this.knowledgeBaseRepository.findSourcesByKnowledgeBaseId(
          knowledgeBaseId,
        );
      sourceIds.push(
        ...sources
          .filter((source) => source.status === SourceStatus.PROCESSING)
          .map((source) => source.id),
      );
    }
    return sourceIds;
  }
}
