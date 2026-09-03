import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { Team } from 'src/iam/teams/domain/team.entity';
import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class ListMyTeamsUseCase {
  private readonly logger = new Logger(ListMyTeamsUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<Team[]> {
    const userId = this.contextService.get('userId');

    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log({ userId }, 'listMyTeams');

    try {
      const teams = await this.teamsRepository.findByUserId(userId);
      this.logger.debug(
        {
          userId,
          count: teams.length,
        },
        'User teams retrieved successfully',
      );

      return teams;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
          userId,
        },
        'Failed to retrieve user teams',
      );
      throw new UnexpectedTeamError(error);
    }
  }
}
