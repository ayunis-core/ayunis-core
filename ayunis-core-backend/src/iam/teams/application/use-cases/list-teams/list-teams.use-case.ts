import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TeamsRepository } from '../../ports/teams.repository';
import { TeamMembersRepository } from '../../ports/team-members.repository';
import { UnexpectedTeamError } from '../../teams.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { TeamWithMemberCount } from './team-with-member-count.view';

@Injectable()
export class ListTeamsUseCase {
  constructor(
    @InjectPinoLogger(ListTeamsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly teamsRepository: TeamsRepository,
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<TeamWithMemberCount[]> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.info({ orgId }, 'listTeams');

    try {
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
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
          orgId,
        },
        'Failed to retrieve teams',
      );
      throw new UnexpectedTeamError(error);
    }
  }
}
