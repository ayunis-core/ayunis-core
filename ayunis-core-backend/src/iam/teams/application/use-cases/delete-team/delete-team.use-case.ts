import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TeamsRepository } from '../../ports/teams.repository';
import { DeleteTeamCommand } from './delete-team.command';
import { TeamNotFoundError } from '../../teams.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class DeleteTeamUseCase {
  constructor(
    @InjectPinoLogger(DeleteTeamUseCase.name)
    private readonly logger: PinoLogger,
    private readonly teamsRepository: TeamsRepository,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  async execute(command: DeleteTeamCommand): Promise<void> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.info({ teamId: command.teamId, orgId }, 'execute');

    const team = await this.teamsRepository.findById(command.teamId);
    if (!team) {
      this.logger.error({ teamId: command.teamId }, 'Team not found');
      throw new TeamNotFoundError(command.teamId);
    }

    if (team.orgId !== orgId) {
      this.logger.error(
        {
          teamId: command.teamId,
          teamOrgId: team.orgId,
          requestOrgId: orgId,
        },
        'Team does not belong to organization',
      );
      throw new TeamNotFoundError(command.teamId);
    }

    // Note: Threads that used shared agents from this team will show a
    // "conversation no longer accessible" disclaimer when the user tries
    // to continue the chat. The history is preserved.

    await this.teamsRepository.delete(command.teamId);

    this.logger.debug({ teamId: command.teamId }, 'Team deleted successfully');
  }
}
