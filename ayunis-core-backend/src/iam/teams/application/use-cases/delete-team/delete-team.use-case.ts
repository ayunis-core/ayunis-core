import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from '../../ports/teams.repository';
import { DeleteTeamCommand } from './delete-team.command';
import { TeamNotFoundError } from '../../teams.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Transactional } from '@nestjs-cls/transactional';
import { FindSharesByTeamUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-team/find-shares-by-team.use-case';
import { FindSharesByTeamQuery } from 'src/domain/shares/application/use-cases/find-shares-by-team/find-shares-by-team.query';
import { ReplaceAgentWithDefaultModelUseCase } from 'src/domain/threads/application/use-cases/replace-agent-with-default-model/replace-agent-with-default-model.use-case';
import { ReplaceAgentWithDefaultModelCommand } from 'src/domain/threads/application/use-cases/replace-agent-with-default-model/replace-agent-with-default-model.command';
import { AgentShare } from 'src/domain/shares/domain/share.entity';

@Injectable()
export class DeleteTeamUseCase {
  private readonly logger = new Logger(DeleteTeamUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly contextService: ContextService,
    private readonly findSharesByTeamUseCase: FindSharesByTeamUseCase,
    private readonly replaceAgentWithDefaultModelUseCase: ReplaceAgentWithDefaultModelUseCase,
  ) {}

  @Transactional()
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

    // Handle thread fallback for shared agents before deletion
    const teamShares = await this.findSharesByTeamUseCase.execute(
      new FindSharesByTeamQuery({ teamId: command.teamId }),
    );

    // Process agent shares - replace agent with default model for non-owners
    for (const share of teamShares) {
      if (share instanceof AgentShare) {
        this.logger.debug(
          'Replacing agent with default model for team members',
          {
            agentId: share.agentId,
            excludeUserId: share.ownerId,
          },
        );
        await this.replaceAgentWithDefaultModelUseCase.execute(
          new ReplaceAgentWithDefaultModelCommand({
            oldAgentId: share.agentId,
            excludeUserId: share.ownerId,
          }),
        );
      }
      // Future: Add handlers for other share types (e.g., PromptShare)
    }

    await this.teamsRepository.delete(command.teamId);

    this.logger.debug('Team deleted successfully', { teamId: command.teamId });
  }
}
