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
  WorkspaceMemberNotFoundError,
  WorkspaceOwnerAccessImmutableError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { UpdateWorkspaceMemberRoleCommand } from './update-workspace-member-role.command';

@Injectable()
export class UpdateWorkspaceMemberRoleUseCase {
  constructor(
    @InjectPinoLogger(UpdateWorkspaceMemberRoleUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: WorkspaceMembersRepository,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: UpdateWorkspaceMemberRoleCommand,
  ): Promise<WorkspaceMember> {
    this.logger.info(
      { workspaceId: command.workspaceId, userId: command.userId },
      'Updating workspace member role',
    );
    const { workspace } = await this.accessService.requireRole(
      command.workspaceId,
      WorkspaceRole.FULL,
    );
    if (workspace.userId === command.userId) {
      throw new WorkspaceOwnerAccessImmutableError(command.workspaceId);
    }
    const member = await this.repository.updateMemberRole(
      command.workspaceId,
      command.userId,
      command.role,
    );
    if (!member)
      throw new WorkspaceMemberNotFoundError(
        command.workspaceId,
        command.userId,
      );
    return member;
  }
}
