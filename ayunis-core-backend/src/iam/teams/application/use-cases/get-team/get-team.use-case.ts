import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from '../../ports/teams.repository';
import { GetTeamQuery } from './get-team.query';
import { Team } from '../../../domain/team.entity';
import { TeamNotFoundError, UnexpectedTeamError } from '../../teams.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class GetTeamUseCase {
  private readonly logger = new Logger(GetTeamUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: GetTeamQuery): Promise<Team> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('execute', { teamId: query.teamId, orgId });

    try {
      const team = await this.teamsRepository.findById(query.teamId);

      if (!team) {
        this.logger.error('Team not found', { teamId: query.teamId });
        throw new TeamNotFoundError(query.teamId);
      }

      if (team.orgId !== orgId) {
        this.logger.error('Team does not belong to organization', {
          teamId: query.teamId,
          teamOrgId: team.orgId,
          requestOrgId: orgId,
        });
        throw new TeamNotFoundError(query.teamId);
      }

      this.logger.debug('Team retrieved successfully', {
        teamId: query.teamId,
      });

      return team;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to retrieve team', {
        error: error instanceof Error ? error.message : 'Unknown error',
        teamId: query.teamId,
      });
      throw new UnexpectedTeamError(error);
    }
  }
}
