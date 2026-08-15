import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AddTeamMemberUseCase } from '../add-team-member/add-team-member.use-case';
import { AddTeamMemberCommand } from '../add-team-member/add-team-member.command';
import { BulkAddTeamMembersCommand } from './bulk-add-team-members.command';
import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import {
  UserAlreadyTeamMemberError,
  UserNotInSameOrgError,
} from '../../team-members.errors';
import { UserNotFoundError } from 'src/iam/users/application/users.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class BulkAddTeamMembersUseCase {
  constructor(
    @InjectPinoLogger(BulkAddTeamMembersUseCase.name)
    private readonly logger: PinoLogger,
    private readonly addTeamMemberUseCase: AddTeamMemberUseCase,
  ) {}

  async execute(command: BulkAddTeamMembersCommand): Promise<TeamMember[]> {
    const uniqueUserIds = [...new Set(command.userIds)];
    this.logger.info(
      { teamId: command.teamId, count: uniqueUserIds.length },
      'execute',
    );

    try {
      const added = await this.addMembers(command, uniqueUserIds);
      this.logger.debug(
        {
          teamId: command.teamId,
          requested: uniqueUserIds.length,
          added: added.length,
        },
        'Bulk add finished',
      );
      return added;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error, teamId: command.teamId },
        'Error bulk adding team members',
      );
      throw error;
    }
  }

  private async addMembers(
    command: BulkAddTeamMembersCommand,
    userIds: BulkAddTeamMembersCommand['userIds'],
  ): Promise<TeamMember[]> {
    const added: TeamMember[] = [];
    for (const userId of userIds) {
      try {
        added.push(
          await this.addTeamMemberUseCase.execute(
            new AddTeamMemberCommand({ teamId: command.teamId, userId }),
          ),
        );
      } catch (error) {
        if (!this.isSkippable(error)) throw error;
        this.logger.warn(
          { teamId: command.teamId, userId, reason: error.code },
          'Skipped user during bulk add',
        );
      }
    }
    return added;
  }

  private isSkippable(
    error: unknown,
  ): error is
    UserAlreadyTeamMemberError | UserNotInSameOrgError | UserNotFoundError {
    return (
      error instanceof UserAlreadyTeamMemberError ||
      error instanceof UserNotInSameOrgError ||
      error instanceof UserNotFoundError
    );
  }
}
