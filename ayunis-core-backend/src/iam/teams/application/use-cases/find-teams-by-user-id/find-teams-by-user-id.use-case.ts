import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from '../../ports/teams.repository';
import { Team } from '../../../domain/team.entity';
import { FindTeamsByUserIdQuery } from './find-teams-by-user-id.query';

@Injectable()
export class FindTeamsByUserIdUseCase {
  private readonly logger = new Logger(FindTeamsByUserIdUseCase.name);

  constructor(private readonly teamsRepository: TeamsRepository) {}

  async execute(query: FindTeamsByUserIdQuery): Promise<Team[]> {
    this.logger.log('execute', { userId: query.userId });

    return this.teamsRepository.findByUserId(query.userId);
  }
}
