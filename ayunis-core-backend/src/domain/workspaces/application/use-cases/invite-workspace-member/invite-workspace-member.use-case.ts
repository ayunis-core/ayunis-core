import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  WorkspaceMembersRepository,
  type WorkspaceMember,
} from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  UnexpectedWorkspaceError,
  WorkspaceMemberAlreadyExistsError,
  WorkspaceMemberNotEligibleError,
  WorkspaceOwnerAccessImmutableError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { FindUsersByIdsQuery } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.query';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { InviteWorkspaceMemberCommand } from './invite-workspace-member.command';

@Injectable()
export class InviteWorkspaceMemberUseCase {
  constructor(
    @InjectPinoLogger(InviteWorkspaceMemberUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: WorkspaceMembersRepository,
    private readonly accessService: WorkspaceAccessService,
    private readonly findUsersByIdsUseCase: FindUsersByIdsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: InviteWorkspaceMemberCommand,
  ): Promise<WorkspaceMember> {
    this.logger.info(
      { workspaceId: command.workspaceId, userId: command.userId },
      'Inviting workspace member',
    );
    const { workspace } = await this.accessService.requireRole(
      command.workspaceId,
      WorkspaceRole.FULL,
    );
    if (workspace.userId === command.userId) {
      throw new WorkspaceOwnerAccessImmutableError(command.workspaceId);
    }

    const users = await this.findUsersByIdsUseCase.execute(
      new FindUsersByIdsQuery([command.userId]),
    );
    if (users.length !== 1) {
      throw new WorkspaceMemberNotEligibleError(command.userId);
    }
    const member = await this.repository.createMember({
      workspaceId: command.workspaceId,
      userId: command.userId,
      role: command.role,
      status: WorkspaceMemberStatus.PENDING,
    });
    if (!member) {
      throw new WorkspaceMemberAlreadyExistsError(
        command.workspaceId,
        command.userId,
      );
    }
    return member;
  }
}
