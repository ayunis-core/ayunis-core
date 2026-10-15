import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';
import type { TeamAdminSummary } from 'src/iam/teams/domain/team-admin-summary';
import { DescribeTeamsQuery } from './describe-teams.query';

export interface TeamDescription {
  id: UUID;
  name: string;
  memberCount: number;
  admins: TeamAdminSummary[];
}

@Injectable()
export class DescribeTeamsUseCase {
  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamMembersRepository: TeamMembersRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(query: DescribeTeamsQuery): Promise<TeamDescription[]> {
    const requestedIds = [...new Set(query.teamIds)];
    if (requestedIds.length === 0) return [];
    const teams = await this.teamsRepository.findByIdsAndOrgId(
      requestedIds,
      query.orgId,
    );
    if (teams.length === 0) return [];
    const teamIds = teams.map(({ id }) => id);
    const [memberCounts, admins] = await Promise.all([
      this.teamMembersRepository.countByTeamIds(teamIds),
      this.teamMembersRepository.findTeamAdminsByTeamIds(teamIds),
    ]);
    return teams.map((team) => ({
      id: team.id,
      name: team.name,
      memberCount: memberCounts.get(team.id) ?? 0,
      admins: admins.get(team.id) ?? [],
    }));
  }
}
