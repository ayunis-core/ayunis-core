import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from '../../ports/teams.repository';
import { TeamMembersRepository } from '../../ports/team-members.repository';
import { UnexpectedTeamError } from '../../teams.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { TeamWithMemberCount } from './team-with-member-count.view';

@Injectable()
export class ListTeamsUseCase {
  private readonly logger = new Logger(ListTeamsUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(): Promise<TeamWithMemberCount[]> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('listTeams', { orgId });

    const teams = await this.teamsRepository.findByOrgId(orgId);
    const counts = await this.teamMembersRepository.countByTeamIds(
      teams.map((team) => team.id),
    );

    this.logger.debug('Teams retrieved successfully', {
      orgId,
      count: teams.length,
    });

    return teams.map((team) => ({
      team,
      memberCount: counts.get(team.id) ?? 0,
    }));
  }
}
