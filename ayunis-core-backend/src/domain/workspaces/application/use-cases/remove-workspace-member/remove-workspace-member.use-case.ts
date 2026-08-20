import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspaceMembersRepository } from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  UnexpectedWorkspaceError,
  WorkspaceMemberNotFoundError,
  WorkspaceOwnerAccessImmutableError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { RemoveWorkspaceMemberCommand } from './remove-workspace-member.command';

@Injectable()
export class RemoveWorkspaceMemberUseCase {
  constructor(
    @InjectPinoLogger(RemoveWorkspaceMemberUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: WorkspaceMembersRepository,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: RemoveWorkspaceMemberCommand): Promise<void> {
    this.logger.info(
      { workspaceId: command.workspaceId, userId: command.userId },
      'Removing workspace member',
    );
    const { workspace } = await this.accessService.requireAccessLevel(
      command.workspaceId,
      WorkspaceAccessLevel.FULL,
    );
    if (workspace.userId === command.userId) {
      throw new WorkspaceOwnerAccessImmutableError(command.workspaceId);
    }
    const member = await this.repository.findMember(
      command.workspaceId,
      command.userId,
    );
    if (!member)
      throw new WorkspaceMemberNotFoundError(
        command.workspaceId,
        command.userId,
      );
    await this.repository.deleteMember(command.workspaceId, command.userId);
  }
}
