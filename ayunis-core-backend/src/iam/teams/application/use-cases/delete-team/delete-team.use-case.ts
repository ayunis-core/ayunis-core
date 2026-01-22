import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from '../../ports/teams.repository';
import { DeleteTeamCommand } from './delete-team.command';
import { TeamNotFoundError } from '../../teams.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class DeleteTeamUseCase {
  private readonly logger = new Logger(DeleteTeamUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: DeleteTeamCommand): Promise<void> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('execute', { teamId: command.teamId, orgId });

    const team = await this.teamsRepository.findById(command.teamId);
    if (!team) {
      this.logger.error('Team not found', { teamId: command.teamId });
      throw new TeamNotFoundError(command.teamId);
    }

    if (team.orgId !== orgId) {
      this.logger.error('Team does not belong to organization', {
        teamId: command.teamId,
        teamOrgId: team.orgId,
        requestOrgId: orgId,
      });
      throw new TeamNotFoundError(command.teamId);
    }

    await this.teamsRepository.delete(command.teamId);

    this.logger.debug('Team deleted successfully', { teamId: command.teamId });
  }
}
