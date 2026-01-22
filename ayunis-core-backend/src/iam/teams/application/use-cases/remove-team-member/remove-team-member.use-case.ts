import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from '../../ports/teams.repository';
import { TeamMembersRepository } from '../../ports/team-members.repository';
import { RemoveTeamMemberCommand } from './remove-team-member.command';
import { TeamNotFoundError } from '../../teams.errors';
import { TeamMemberNotFoundError } from '../../team-members.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class RemoveTeamMemberUseCase {
  private readonly logger = new Logger(RemoveTeamMemberUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly contextService: ContextService,
  ) {}

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
