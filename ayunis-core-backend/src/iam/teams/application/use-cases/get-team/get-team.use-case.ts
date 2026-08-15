import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TeamsRepository } from '../../ports/teams.repository';
import { GetTeamQuery } from './get-team.query';
import { Team } from '../../../domain/team.entity';
import { TeamNotFoundError, UnexpectedTeamError } from '../../teams.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class GetTeamUseCase {
  constructor(
    @InjectPinoLogger(GetTeamUseCase.name)
    private readonly logger: PinoLogger,
    private readonly teamsRepository: TeamsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: GetTeamQuery): Promise<Team> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.info({ teamId: query.teamId, orgId }, 'execute');

    try {
      const team = await this.teamsRepository.findById(query.teamId);

      if (!team) {
        this.logger.error({ teamId: query.teamId }, 'Team not found');
        throw new TeamNotFoundError(query.teamId);
      }

      if (team.orgId !== orgId) {
        this.logger.error(
          {
            teamId: query.teamId,
            teamOrgId: team.orgId,
            requestOrgId: orgId,
          },
          'Team does not belong to organization',
        );
        throw new TeamNotFoundError(query.teamId);
      }

      this.logger.debug(
        {
          teamId: query.teamId,
        },
        'Team retrieved successfully',
      );

      return team;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
          teamId: query.teamId,
        },
        'Failed to retrieve team',
      );
      throw new UnexpectedTeamError(error);
    }
  }
}
