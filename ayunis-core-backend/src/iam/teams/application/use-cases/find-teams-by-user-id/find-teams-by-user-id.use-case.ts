import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from '../../ports/teams.repository';
import { Team } from '../../../domain/team.entity';
import { FindTeamsByUserIdQuery } from './find-teams-by-user-id.query';
import { UnexpectedTeamError } from '../../teams.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class FindTeamsByUserIdUseCase {
  private readonly logger = new Logger(FindTeamsByUserIdUseCase.name);

  constructor(private readonly teamsRepository: TeamsRepository) {}

  async execute(query: FindTeamsByUserIdQuery): Promise<Team[]> {
    this.logger.log('execute', { userId: query.userId });

    try {
      return await this.teamsRepository.findByUserId(query.userId);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to find teams by user ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: query.userId,
      });
      throw new UnexpectedTeamError(error);
    }
  }
}
