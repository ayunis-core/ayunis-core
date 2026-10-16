import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspaceSharingContextService } from 'src/domain/workspaces/application/services/workspace-sharing-context.service';
import { requireChangeableMember } from 'src/domain/workspaces/application/services/workspace-sharing.guards';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { SetWorkspaceMemberAccessCommand } from './set-workspace-member-access.command';

@Injectable()
export class SetWorkspaceMemberAccessUseCase {
  private readonly logger = new Logger(SetWorkspaceMemberAccessUseCase.name);

  constructor(private readonly sharing: WorkspaceSharingContextService) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  @Transactional()
  async execute(
    command: SetWorkspaceMemberAccessCommand,
  ): Promise<{ unlinkedCount: number }> {
    this.logger.log(command, 'Setting workspace member access');
    const context = await this.sharing.load(command.workspaceId);
    const placement = requireChangeableMember(
      context,
      command.userId,
      command.teamId,
    );
    context.sharing.setLevel(
      command.userId,
      command.accessLevel,
      placement,
      context.directory,
    );
    return this.sharing.save(context);
  }
}
