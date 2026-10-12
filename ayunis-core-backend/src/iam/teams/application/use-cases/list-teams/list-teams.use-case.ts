import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { TeamWithMemberCount } from './team-with-member-count.view';
import { getRequiredOrgId } from 'src/common/context/required-context';

@Injectable()
export class ListTeamsUseCase {
  private readonly logger = new Logger(ListTeamsUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(targetOrgId?: UUID): Promise<TeamWithMemberCount[]> {
    const orgId = getRequiredOrgId(this.contextService, targetOrgId);

    this.logger.log({ orgId }, 'listTeams');

    const teams = await this.teamsRepository.findByOrgId(orgId);
    const counts = await this.teamMembersRepository.countByTeamIds(
      teams.map((team) => team.id),
    );

    this.logger.debug(
      {
        orgId,
        count: teams.length,
      },
      'Teams retrieved successfully',
    );

    return teams.map((team) => ({
      team,
      memberCount: counts.get(team.id) ?? 0,
    }));
  }
}
