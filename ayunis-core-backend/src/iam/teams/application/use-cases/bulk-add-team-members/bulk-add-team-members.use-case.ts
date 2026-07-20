import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(BulkAddTeamMembersUseCase.name);

  constructor(private readonly addTeamMemberUseCase: AddTeamMemberUseCase) {}

  async execute(command: BulkAddTeamMembersCommand): Promise<TeamMember[]> {
    const uniqueUserIds = [...new Set(command.userIds)];

    this.logger.log('execute', {
      teamId: command.teamId,
      count: uniqueUserIds.length,
    });

    try {
      const added: TeamMember[] = [];
      for (const userId of uniqueUserIds) {
        try {
          added.push(
            await this.addTeamMemberUseCase.execute(
              new AddTeamMemberCommand({ teamId: command.teamId, userId }),
            ),
          );
        } catch (error) {
          if (
            error instanceof UserAlreadyTeamMemberError ||
            error instanceof UserNotInSameOrgError ||
            error instanceof UserNotFoundError
          ) {
            this.logger.warn('Skipped user during bulk add', {
              teamId: command.teamId,
              userId,
              reason: error.code,
            });
            continue;
          }
          throw error;
        }
      }

      this.logger.debug('Bulk add finished', {
        teamId: command.teamId,
        requested: uniqueUserIds.length,
        added: added.length,
      });

      return added;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error bulk adding team members', {
        error: error instanceof Error ? error.message : 'Unknown error',
        teamId: command.teamId,
      });
      throw error;
    }
  }
}
