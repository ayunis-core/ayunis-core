import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { TeamAccessService } from 'src/iam/teams/application/services/team-access.service';
import { LastTeamAdminError } from 'src/iam/teams/application/team-members.errors';

interface TeamAdminChange {
  teamId: UUID;
  userId: UUID;
  orgId?: UUID;
}

@Injectable()
export class LastTeamAdminPolicy {
  private readonly logger = new Logger(LastTeamAdminPolicy.name);

  constructor(
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly teamAccess: TeamAccessService,
  ) {}

  async assertMayLoseAdmin(change: TeamAdminChange): Promise<void> {
    if (this.teamAccess.mayChangeLastTeamAdmin(change.orgId)) return;
    const adminIds = await this.teamMembersRepository.lockTeamAdminUserIds(
      change.teamId,
    );
    if (adminIds.length !== 1 || adminIds[0] !== change.userId) return;
    this.logger.warn(
      { teamId: change.teamId, userId: change.userId },
      'Refused to change the last team admin',
    );
    throw new LastTeamAdminError(change.teamId, change.userId);
  }
}
