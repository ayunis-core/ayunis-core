import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';
import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from '../../ports/teams.repository';
import { TeamMembersRepository } from '../../ports/team-members.repository';
import { RemoveTeamMemberCommand } from './remove-team-member.command';
import { TeamMemberNotFoundError } from '../../team-members.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Transactional } from '@nestjs-cls/transactional';
import { findTeamInOrganization } from '../../utils/find-team-in-organization';

@Injectable()
export class RemoveTeamMemberUseCase {
  private readonly logger = new Logger(RemoveTeamMemberUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedTeamError)
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

    await findTeamInOrganization(
      this.teamsRepository,
      command.teamId,
      orgId,
      this.logger,
    );

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

    // Note: Threads that used shared agents from this team will show a
    // "conversation no longer accessible" disclaimer when the removed user
    // tries to continue the chat. The history is preserved.

    // Remove team member
    await this.teamMembersRepository.deleteByTeamIdAndUserId(
      command.teamId,
      command.userId,
    );

    this.logger.debug('Team member removed successfully', {
      teamId: command.teamId,
      userId: command.userId,
    });
  }
}
