import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from '../../ports/teams.repository';
import { TeamMembersRepository } from '../../ports/team-members.repository';
import { RemoveTeamMemberCommand } from './remove-team-member.command';
import { TeamNotFoundError } from '../../teams.errors';
import { TeamMemberNotFoundError } from '../../team-members.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Transactional } from '@nestjs-cls/transactional';
import { FindSharesByTeamUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-team/find-shares-by-team.use-case';
import { FindSharesByTeamQuery } from 'src/domain/shares/application/use-cases/find-shares-by-team/find-shares-by-team.query';
import { ReplaceAgentWithDefaultModelForUserUseCase } from 'src/domain/threads/application/use-cases/replace-agent-with-default-model-for-user/replace-agent-with-default-model-for-user.use-case';
import { ReplaceAgentWithDefaultModelForUserCommand } from 'src/domain/threads/application/use-cases/replace-agent-with-default-model-for-user/replace-agent-with-default-model-for-user.command';
import { AgentShare } from 'src/domain/shares/domain/share.entity';

@Injectable()
export class RemoveTeamMemberUseCase {
  private readonly logger = new Logger(RemoveTeamMemberUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly contextService: ContextService,
    private readonly findSharesByTeamUseCase: FindSharesByTeamUseCase,
    private readonly replaceAgentWithDefaultModelForUserUseCase: ReplaceAgentWithDefaultModelForUserUseCase,
  ) {}

  @Transactional()
  async execute(command: RemoveTeamMemberCommand): Promise<void> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('execute', {
      teamId: command.teamId,
      userId: command.userId,
      orgId,
    });

    try {
      // Verify team exists and belongs to organization
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

      // Verify user is a member of the team
      const existingMember =
        await this.teamMembersRepository.findByTeamIdAndUserId(
          command.teamId,
          command.userId,
        );

      if (!existingMember) {
        this.logger.error('User is not a team member', {
          teamId: command.teamId,
          userId: command.userId,
        });
        throw new TeamMemberNotFoundError(command.teamId, command.userId);
      }

      // Handle thread fallback for shared agents before removal
      const teamShares = await this.findSharesByTeamUseCase.execute(
        new FindSharesByTeamQuery({ teamId: command.teamId }),
      );

      // Process agent shares - replace agent with default model for the removed user
      // Skip if the user is the owner of the agent (they still have access via ownership)
      for (const share of teamShares) {
        if (share instanceof AgentShare && share.ownerId !== command.userId) {
          this.logger.debug(
            'Replacing agent with default model for removed user',
            {
              agentId: share.agentId,
              userId: command.userId,
            },
          );
          await this.replaceAgentWithDefaultModelForUserUseCase.execute(
            new ReplaceAgentWithDefaultModelForUserCommand({
              agentId: share.agentId,
              userId: command.userId,
            }),
          );
        }
        // Future: Add handlers for other share types (e.g., PromptShare)
      }

      // Remove team member
      await this.teamMembersRepository.deleteByTeamIdAndUserId(
        command.teamId,
        command.userId,
      );

      this.logger.debug('Team member removed successfully', {
        teamId: command.teamId,
        userId: command.userId,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to remove team member', {
        error: error instanceof Error ? error.message : 'Unknown error',
        teamId: command.teamId,
        userId: command.userId,
      });
      throw error;
    }
  }
}
