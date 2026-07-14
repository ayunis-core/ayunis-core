import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from '../../ports/teams.repository';
import { Team } from '../../../domain/team.entity';
import { UnexpectedTeamError } from '../../teams.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class ListMyTeamsUseCase {
  private readonly logger = new Logger(ListMyTeamsUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(): Promise<Team[]> {
    const userId = this.contextService.get('userId');

    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('listMyTeams', { userId });

    const teams = await this.teamsRepository.findByUserId(userId);
    this.logger.debug('User teams retrieved successfully', {
      userId,
      count: teams.length,
    });

    return teams;
  }
}
