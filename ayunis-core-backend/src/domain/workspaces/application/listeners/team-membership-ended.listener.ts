import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WorkspaceLinkCleanupService } from 'src/domain/workspaces/application/services/workspace-link-cleanup.service';
import { TeamMembershipEndedEvent } from 'src/iam/teams/application/events/team-membership-ended.event';

@Injectable()
export class WorkspacesTeamMembershipEndedListener {
  private readonly logger = new Logger(
    WorkspacesTeamMembershipEndedListener.name,
  );

  constructor(private readonly linkCleanup: WorkspaceLinkCleanupService) {}

  @OnEvent(TeamMembershipEndedEvent.EVENT_NAME)
  async handle(event: TeamMembershipEndedEvent): Promise<void> {
    if (event.userIds.length === 0) return;
    try {
      await this.linkCleanup.removeLinksOfPeopleWithoutAccess({
        ownerIds: event.userIds,
      });
    } catch (error) {
      this.logger.error(
        { err: error as Error, teamId: event.teamId },
        'Failed to remove links after team membership ended',
      );
    }
  }
}
