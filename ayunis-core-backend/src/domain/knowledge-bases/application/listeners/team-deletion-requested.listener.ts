import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseProcessingCleanupService } from 'src/domain/knowledge-bases/application/services/knowledge-base-processing-cleanup.service';
import { TeamDeletionRequestedEvent } from 'src/iam/teams/application/events/team-deletion-requested.event';

@Injectable()
export class KnowledgeBasesTeamDeletionRequestedListener {
  private readonly logger = new Logger(
    KnowledgeBasesTeamDeletionRequestedListener.name,
  );

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly processingCleanup: KnowledgeBaseProcessingCleanupService,
  ) {}

  @OnEvent(TeamDeletionRequestedEvent.EVENT_NAME)
  async handle(event: TeamDeletionRequestedEvent): Promise<void> {
    try {
      const knowledgeBases = await this.repository.findAllByTeamId(
        event.teamId,
      );
      await this.processingCleanup.deferProcessingCleanup(
        event,
        knowledgeBases.map(({ id }) => id),
        event.orgId,
        'team',
      );
    } catch (error) {
      this.logger.error(
        { teamId: event.teamId, err: error as Error },
        'Failed to resolve knowledge base sources for team deletion',
      );
    }
  }
}
