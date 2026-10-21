import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import {
  ALL_TEAMS,
  TeamAccessService,
} from 'src/iam/teams/application/services/team-access.service';
import { TeamAccessDeniedError } from 'src/iam/teams/application/team-members.errors';
import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';
import type { Team } from 'src/iam/teams/domain/team.entity';
import type { ManageableTeam } from './manageable-team.view';

@Injectable()
export class ListManageableTeamsUseCase {
  private readonly logger = new Logger(ListManageableTeamsUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly teamAccess: TeamAccessService,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(): Promise<ManageableTeam[]> {
    const { orgId } = getRequiredUserContext(this.context);
    const teams = await this.findTeams(orgId);
    const teamIds = teams.map((team) => team.id);
    const [counts, admins] = await Promise.all([
      this.teamMembersRepository.countByTeamIds(teamIds),
      this.teamMembersRepository.findTeamAdminsByTeamIds(teamIds),
    ]);
    this.logger.debug({ orgId, count: teams.length }, 'Manageable teams');

    return teams.map((team) => ({
      team,
      memberCount: counts.get(team.id) ?? 0,
      teamAdmins: admins.get(team.id) ?? [],
    }));
  }

  private async findTeams(orgId: UUID): Promise<Team[]> {
    const scope = await this.teamAccess.manageableTeamIds();
    if (scope === ALL_TEAMS) return this.teamsRepository.findByOrgId(orgId);
    if (scope.length === 0) throw new TeamAccessDeniedError();
    return this.teamsRepository.findByIdsAndOrgId(scope, orgId);
  }
}
