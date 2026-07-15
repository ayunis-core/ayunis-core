import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from '../../ports/teams.repository';
import { Team } from '../../../domain/team.entity';
import { FindTeamsByUserIdQuery } from './find-teams-by-user-id.query';
import { UnexpectedTeamError } from '../../teams.errors';

@Injectable()
export class FindTeamsByUserIdUseCase {
  private readonly logger = new Logger(FindTeamsByUserIdUseCase.name);

  constructor(private readonly teamsRepository: TeamsRepository) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(query: FindTeamsByUserIdQuery): Promise<Team[]> {
    this.logger.log('execute', { userId: query.userId });

    return await this.teamsRepository.findByUserId(query.userId);
  }
}
