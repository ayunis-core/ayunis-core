import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseProcessingCleanupService } from 'src/domain/knowledge-bases/application/services/knowledge-base-processing-cleanup.service';
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
    private readonly processingCleanup: KnowledgeBaseProcessingCleanupService,
  ) {}

  @OnEvent(WorkspaceDeletionRequestedEvent.EVENT_NAME)
  async handle(event: WorkspaceDeletionRequestedEvent): Promise<void> {
    try {
      const knowledgeBases = await this.repository.findAllByWorkspaceId(
        event.workspaceId,
      );
      await this.processingCleanup.deferProcessingCleanup(
        event,
        knowledgeBases.map(({ id }) => id),
        event.orgId,
        'workspace',
      );
    } catch (error) {
      this.logger.error(
        { workspaceId: event.workspaceId, err: error as Error },
        'Failed to resolve knowledge base sources for workspace deletion',
      );
    }
  }
}
