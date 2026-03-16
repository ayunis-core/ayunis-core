import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import {
  TeamMembershipPort,
  type TeamMembershipInfo,
} from '../../application/ports/team-membership.port';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';

@Injectable()
export class TeamMembershipAdapter extends TeamMembershipPort {
  constructor(private readonly teamsRepository: TeamsRepository) {
    super();
  }

  async findTeamsByUserIdAndOrg(
    userId: UUID,
    orgId: UUID,
  ): Promise<TeamMembershipInfo[]> {
    const teams = await this.teamsRepository.findByUserId(userId);

    return teams
      .filter((team) => team.orgId === orgId)
      .map((team) => ({
        id: team.id,
        orgId: team.orgId,
        modelOverrideEnabled: team.modelOverrideEnabled,
      }));
  }
}
