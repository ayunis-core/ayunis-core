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
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { UpdateWorkspaceMemberAccessLevelCommand } from './update-workspace-member-access-level.command';

@Injectable()
export class UpdateWorkspaceMemberAccessLevelUseCase {
  constructor(
    @InjectPinoLogger(UpdateWorkspaceMemberAccessLevelUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: WorkspaceMembersRepository,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: UpdateWorkspaceMemberAccessLevelCommand,
  ): Promise<WorkspaceMember> {
    this.logger.info(
      { workspaceId: command.workspaceId, userId: command.userId },
      'Updating workspace member access level',
    );
    const { workspace } = await this.accessService.requireAccessLevel(
      command.workspaceId,
      WorkspaceAccessLevel.FULL,
    );
    if (workspace.userId === command.userId) {
      throw new WorkspaceOwnerAccessImmutableError(command.workspaceId);
    }
    const member = await this.repository.updateMemberAccessLevel(
      command.workspaceId,
      command.userId,
      command.accessLevel,
    );
    if (!member)
      throw new WorkspaceMemberNotFoundError(
        command.workspaceId,
        command.userId,
      );
    return member;
  }
}
