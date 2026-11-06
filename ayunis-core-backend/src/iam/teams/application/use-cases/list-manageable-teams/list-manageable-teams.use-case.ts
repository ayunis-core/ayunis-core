import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';
import {
  TeamAccessService,
  type TeamPrincipal,
} from 'src/iam/teams/application/services/team-access.service';
import type { TeamWithMemberCount } from 'src/iam/teams/application/use-cases/list-teams/team-with-member-count.view';
import type { Team } from 'src/iam/teams/domain/team.entity';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

const TEAM_MANAGEMENT = [
  Permission.MANAGE_TEAMS,
  Permission.ASSIGN_USERS_TO_TEAMS,
] as const;

/**
 * Organisation-wide team managers see every team; anyone else sees the teams
 * their team role lets them manage.
 */
@Injectable()
export class ListManageableTeamsUseCase {
  private readonly logger = new Logger(ListManageableTeamsUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly teamAccessService: TeamAccessService,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(): Promise<TeamWithMemberCount[]> {
    const principal = getRequiredUserContext(this.context);
    this.logger.log({ orgId: principal.orgId }, 'Listing manageable teams');

    const teams = await this.findManageableTeams(principal);
    const counts = await this.teamMembersRepository.countByTeamIds(
      teams.map((team) => team.id),
    );
    return teams.map((team) => ({
      team,
      memberCount: counts.get(team.id) ?? 0,
    }));
  }

  private async findManageableTeams(principal: TeamPrincipal): Promise<Team[]> {
    const { orgAccess, byTeamId } =
      await this.teamAccessService.forMemberships(principal);
    if (orgAccess.canAny(...TEAM_MANAGEMENT)) {
      return this.teamsRepository.findByOrgId(principal.orgId);
    }

    const teamIds: UUID[] = [...byTeamId]
      .filter(([, access]) => access.canAny(...TEAM_MANAGEMENT))
      .map(([teamId]) => teamId);
    const teams = await this.teamsRepository.findByIdsAndOrgId(
      teamIds,
      principal.orgId,
    );
    return teams.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
