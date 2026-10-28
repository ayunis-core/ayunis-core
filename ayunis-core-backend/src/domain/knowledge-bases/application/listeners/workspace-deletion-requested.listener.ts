import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { CleanupSourceProcessingCommand } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.command';
import { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { WorkspaceDeletionRequestedEvent } from 'src/domain/workspaces/application/events/workspace-deletion-requested.event';

/**
 * Workspace → knowledge bases → sources → index chunks are deleted by FK cascade.
 * Only queue jobs and temporary processing files need explicit cleanup afterward.
 */
@Injectable()
export class KnowledgeBasesWorkspaceDeletionRequestedListener {
  private readonly logger = new Logger(
    KnowledgeBasesWorkspaceDeletionRequestedListener.name,
  );

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly cleanupSourceProcessingUseCase: CleanupSourceProcessingUseCase,
  ) {}

  @OnEvent(WorkspaceDeletionRequestedEvent.EVENT_NAME)
  async handle(event: WorkspaceDeletionRequestedEvent): Promise<void> {
    try {
      const knowledgeBases = await this.repository.findAllByWorkspaceId(
        event.workspaceId,
      );
      if (knowledgeBases.length === 0) {
        return;
      }

      const sources = await this.repository.findSourcesByKnowledgeBaseIds(
        knowledgeBases.map((knowledgeBase) => knowledgeBase.id),
      );
      if (sources.length === 0) {
        return;
      }

      const processingSourceIds = sources
        .filter((source) => source.status === SourceStatus.PROCESSING)
        .map((source) => source.id);

      if (processingSourceIds.length > 0) {
        event.deferCleanup('cleanup workspace source processing', () =>
          this.cleanupSourceProcessingUseCase.execute(
            new CleanupSourceProcessingCommand(
              processingSourceIds,
              event.orgId,
            ),
          ),
        );
      }
    } catch (error) {
      this.logger.error(
        { workspaceId: event.workspaceId, err: error as Error },
        'Failed to resolve knowledge base sources for workspace deletion',
      );
    }
  }
}
