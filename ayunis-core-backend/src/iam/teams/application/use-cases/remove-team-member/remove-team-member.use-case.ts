import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { RemoveTeamMemberCommand } from './remove-team-member.command';
import { TeamNotFoundError } from 'src/iam/teams/application/teams.errors';
import { TeamMemberNotFoundError } from 'src/iam/teams/application/team-members.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class RemoveTeamMemberUseCase {
  private readonly logger = new Logger(RemoveTeamMemberUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  async execute(command: RemoveTeamMemberCommand): Promise<void> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log(
      {
        teamId: command.teamId,
        userId: command.userId,
        orgId,
      },
      'execute',
    );

    try {
      await this.removeMember(command, orgId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error, teamId: command.teamId, userId: command.userId },
        'Failed to remove team member',
      );
      throw error;
    }
  }

  private async removeMember(
    command: RemoveTeamMemberCommand,
    orgId: UUID,
  ): Promise<void> {
    await this.assertTeamBelongsToOrg(command.teamId, orgId);
    await this.assertMemberExists(command.teamId, command.userId);
    // Shared-agent thread history is retained; access is denied after removal.
    await this.teamMembersRepository.deleteByTeamIdAndUserId(
      command.teamId,
      command.userId,
    );
    this.logger.debug(
      { teamId: command.teamId, userId: command.userId },
      'Team member removed successfully',
    );
  }

  private async assertTeamBelongsToOrg(
    teamId: UUID,
    orgId: UUID,
  ): Promise<void> {
    const team = await this.teamsRepository.findById(teamId);
    if (!team) {
      this.logger.error({ teamId }, 'Team not found');
      throw new TeamNotFoundError(teamId);
    }
    if (team.orgId !== orgId) {
      this.logger.error(
        { teamId, teamOrgId: team.orgId, requestOrgId: orgId },
        'Team does not belong to organization',
      );
      throw new TeamNotFoundError(teamId);
    }
  }

  private async assertMemberExists(teamId: UUID, userId: UUID): Promise<void> {
    const member = await this.teamMembersRepository.findByTeamIdAndUserId(
      teamId,
      userId,
    );
    if (member) return;
    this.logger.error({ teamId, userId }, 'User is not a team member');
    throw new TeamMemberNotFoundError(teamId, userId);
  }
}
