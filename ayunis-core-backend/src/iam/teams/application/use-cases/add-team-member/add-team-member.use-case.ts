import { Injectable, Logger } from '@nestjs/common';
import { TeamsRepository } from '../../ports/teams.repository';
import { TeamMembersRepository } from '../../ports/team-members.repository';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { AddTeamMemberCommand } from './add-team-member.command';
import { TeamMember } from '../../../domain/team-member.entity';
import { TeamNotFoundError } from '../../teams.errors';
import {
  UserAlreadyTeamMemberError,
  UserNotInSameOrgError,
} from '../../team-members.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class AddTeamMemberUseCase {
  private readonly logger = new Logger(AddTeamMemberUseCase.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: AddTeamMemberCommand): Promise<TeamMember> {
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

      // Verify user exists (throws UserNotFoundError if not found)
      const user = await this.findUserByIdUseCase.execute(
        new FindUserByIdQuery(command.userId),
      );

      // Verify user belongs to same organization
      if (user.orgId !== orgId) {
        this.logger.error('User does not belong to organization', {
          userId: command.userId,
          userOrgId: user.orgId,
          requestOrgId: orgId,
        });
        throw new UserNotInSameOrgError(command.userId);
      }

      // Check if user is already a member
      const existingMember =
        await this.teamMembersRepository.findByTeamIdAndUserId(
          command.teamId,
          command.userId,
        );

      if (existingMember) {
        this.logger.error('User is already a team member', {
          teamId: command.teamId,
          userId: command.userId,
        });
        throw new UserAlreadyTeamMemberError(command.teamId, command.userId);
      }

      // Create team member
      const teamMember = new TeamMember({
        teamId: command.teamId,
        userId: command.userId,
      });

      const createdMember = await this.teamMembersRepository.create(teamMember);

      this.logger.debug('Team member added successfully', {
        teamId: command.teamId,
        userId: command.userId,
        memberId: createdMember.id,
      });

      return createdMember;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to add team member', {
        error: error instanceof Error ? error.message : 'Unknown error',
        teamId: command.teamId,
        userId: command.userId,
      });
      throw error;
    }
  }
}
