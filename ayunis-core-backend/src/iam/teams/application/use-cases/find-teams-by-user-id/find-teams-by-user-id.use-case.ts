import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TeamsRepository } from '../../ports/teams.repository';
import { Team } from 'src/iam/teams/domain/team.entity';
import { FindTeamsByUserIdQuery } from './find-teams-by-user-id.query';
import { UnexpectedTeamError } from '../../teams.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class FindTeamsByUserIdUseCase {
  constructor(
    @InjectPinoLogger(FindTeamsByUserIdUseCase.name)
    private readonly logger: PinoLogger,
    private readonly teamsRepository: TeamsRepository,
  ) {}

  async execute(query: FindTeamsByUserIdQuery): Promise<Team[]> {
    this.logger.info({ userId: query.userId }, 'execute');

    try {
      return await this.teamsRepository.findByUserId(query.userId);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
          userId: query.userId,
        },
        'Failed to find teams by user ID',
      );
      throw new UnexpectedTeamError(error);
    }
  }
}
