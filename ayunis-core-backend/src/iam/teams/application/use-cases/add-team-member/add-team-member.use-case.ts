import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  constructor(
    @InjectPinoLogger(AddTeamMemberUseCase.name)
    private readonly logger: PinoLogger,
    private readonly teamsRepository: TeamsRepository,
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: AddTeamMemberCommand): Promise<TeamMember> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) throw new UnauthorizedAccessError();

    this.logger.info(
      { teamId: command.teamId, userId: command.userId, orgId },
      'execute',
    );

    try {
      return await this.addMember(command, orgId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error, teamId: command.teamId, userId: command.userId },
        'Failed to add team member',
      );
      throw error;
    }
  }

  private async addMember(
    command: AddTeamMemberCommand,
    orgId: UUID,
  ): Promise<TeamMember> {
    await this.assertTeamBelongsToOrg(command.teamId, orgId);
    await this.assertUserBelongsToOrg(command.userId, orgId);
    await this.assertNotMember(command.teamId, command.userId);

    const createdMember = await this.teamMembersRepository.create(
      new TeamMember({ teamId: command.teamId, userId: command.userId }),
    );
    this.logger.debug(
      {
        teamId: command.teamId,
        userId: command.userId,
        memberId: createdMember.id,
      },
      'Team member added successfully',
    );
    return createdMember;
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

  private async assertUserBelongsToOrg(
    userId: UUID,
    orgId: UUID,
  ): Promise<void> {
    const user = await this.findUserByIdUseCase.execute(
      new FindUserByIdQuery(userId),
    );
    if (user.orgId === orgId) return;
    this.logger.error(
      { userId, userOrgId: user.orgId, requestOrgId: orgId },
      'User does not belong to organization',
    );
    throw new UserNotInSameOrgError(userId);
  }

  private async assertNotMember(teamId: UUID, userId: UUID): Promise<void> {
    const existingMember =
      await this.teamMembersRepository.findByTeamIdAndUserId(teamId, userId);
    if (!existingMember) return;
    this.logger.error({ teamId, userId }, 'User is already a team member');
    throw new UserAlreadyTeamMemberError(teamId, userId);
  }
}
