import { Injectable, Logger } from '@nestjs/common';
import { TeamMemberCreationService } from 'src/iam/teams/application/services/team-member-creation.service';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredOrgId } from 'src/common/context/required-context';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedTeamMemberError } from 'src/iam/teams/application/team-members.errors';
import { AddTeamMemberCommand } from 'src/iam/teams/application/use-cases/add-team-member/add-team-member.command';
import { BulkAddTeamMembersCommand } from './bulk-add-team-members.command';
import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import {
  UserAlreadyTeamMemberError,
  UserNotInSameOrgError,
} from 'src/iam/teams/application/team-members.errors';
import { UserNotFoundError } from 'src/iam/users/application/users.errors';

@Injectable()
export class BulkAddTeamMembersUseCase {
  private readonly logger = new Logger(BulkAddTeamMembersUseCase.name);

  constructor(
    private readonly createMember: TeamMemberCreationService,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTeamMemberError)
  async execute(command: BulkAddTeamMembersCommand): Promise<TeamMember[]> {
    const orgId = getRequiredOrgId(this.context, command.orgId);
    const uniqueUserIds = [...new Set(command.userIds)];
    this.logger.log(
      { teamId: command.teamId, count: uniqueUserIds.length },
      'execute',
    );

    const added = await this.addMembers(command, uniqueUserIds, orgId);
    this.logger.debug(
      {
        teamId: command.teamId,
        requested: uniqueUserIds.length,
        added: added.length,
      },
      'Bulk add finished',
    );
    return added;
  }

  private async addMembers(
    command: BulkAddTeamMembersCommand,
    userIds: BulkAddTeamMembersCommand['userIds'],
    orgId: UUID,
  ): Promise<TeamMember[]> {
    const added: TeamMember[] = [];
    for (const userId of userIds) {
      try {
        added.push(
          await this.createMember.add(
            new AddTeamMemberCommand({
              teamId: command.teamId,
              orgId: command.orgId,
              userId,
            }),
            orgId,
          ),
        );
      } catch (error) {
        if (!this.isSkippable(error)) throw error;
        this.logger.warn(
          {
            teamId: command.teamId,
            orgId: command.orgId,
            userId,
            reason: error.code,
          },
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
