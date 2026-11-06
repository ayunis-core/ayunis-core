import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillSourceCleanupService } from 'src/domain/skills/application/services/skill-source-cleanup.service';
import { TeamDeletionRequestedEvent } from 'src/iam/teams/application/events/team-deletion-requested.event';

@Injectable()
export class SkillsTeamDeletionRequestedListener {
  private readonly logger = new Logger(
    SkillsTeamDeletionRequestedListener.name,
  );

  constructor(
    private readonly repository: SkillRepository,
    private readonly sourceCleanup: SkillSourceCleanupService,
  ) {}

  @OnEvent(TeamDeletionRequestedEvent.EVENT_NAME)
  async handle(event: TeamDeletionRequestedEvent): Promise<void> {
    try {
      const skills = await this.repository.findAllByTeamId(event.teamId);
      await this.sourceCleanup.deferSourceCleanup(
        event,
        skills,
        event.orgId,
        'team',
      );
    } catch (error) {
      this.logger.error(
        { teamId: event.teamId, err: error as Error },
        'Failed to resolve skill sources for team deletion',
      );
    }
  }
}
