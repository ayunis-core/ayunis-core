import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { UserDeletionRequestedEvent } from 'src/iam/users/application/events/user-deletion-requested.event';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { KnowledgeBaseRepository } from '../ports/knowledge-base.repository';

/**
 * Deletes the sources (and their RAG index entries + processing files) of a
 * user's knowledge bases when the user is being deleted.
 *
 * The knowledge_base rows are removed by the `knowledge_bases.userId` FK
 * cascade, but `sources.knowledgeBaseId` is `ON DELETE SET NULL`, so sources
 * would otherwise be orphaned with their embeddings left in the vector index.
 * This listener removes them explicitly while the knowledge bases still exist.
 * Failures are logged, never thrown, so cleanup issues never block deletion.
 */
@Injectable()
export class KnowledgeBasesUserDeletionRequestedListener {
  private readonly logger = new Logger(
    KnowledgeBasesUserDeletionRequestedListener.name,
  );

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly deleteSourcesUseCase: DeleteSourcesUseCase,
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

      const sourceIds = await this.collectSourceIds(
        knowledgeBases.map((kb) => kb.id),
      );

      if (sourceIds.length === 0) {
        return;
      }

      this.logger.log('Deleting knowledge base sources for deleted user', {
        userId: event.userId,
        knowledgeBaseCount: knowledgeBases.length,
        sourceCount: sourceIds.length,
      });

      await this.deleteSourcesUseCase.execute(
        new DeleteSourcesCommand(sourceIds),
      );
    } catch (error) {
      this.logger.error(
        'Failed to clean up knowledge base sources for deleted user',
        {
          userId: event.userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
    }
  }

  private async collectSourceIds(knowledgeBaseIds: UUID[]): Promise<UUID[]> {
    const sourceIds: UUID[] = [];
    for (const knowledgeBaseId of knowledgeBaseIds) {
      const sources =
        await this.knowledgeBaseRepository.findSourcesByKnowledgeBaseId(
          knowledgeBaseId,
        );
      sourceIds.push(...sources.map((source) => source.id));
    }
    return sourceIds;
  }
}
