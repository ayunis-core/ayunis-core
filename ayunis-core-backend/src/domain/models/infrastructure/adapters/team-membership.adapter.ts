import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import {
  TeamMembershipPort,
  type TeamMembershipInfo,
} from '../../application/ports/team-membership.port';
import { FindTeamsByUserIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-user-id/find-teams-by-user-id.use-case';
import { FindTeamsByUserIdQuery } from 'src/iam/teams/application/use-cases/find-teams-by-user-id/find-teams-by-user-id.query';

@Injectable()
export class TeamMembershipAdapter extends TeamMembershipPort {
  constructor(
    private readonly findTeamsByUserIdUseCase: FindTeamsByUserIdUseCase,
  ) {
    super();
  }

  async findTeamsByUserIdAndOrg(
    userId: UUID,
    orgId: UUID,
  ): Promise<TeamMembershipInfo[]> {
    const teams = await this.findTeamsByUserIdUseCase.execute(
      new FindTeamsByUserIdQuery(userId),
    );

    return teams
      .filter((team) => team.orgId === orgId)
      .map((team) => ({
        id: team.id,
        orgId: team.orgId,
        modelOverrideEnabled: team.modelOverrideEnabled,
      }));
  }
}
