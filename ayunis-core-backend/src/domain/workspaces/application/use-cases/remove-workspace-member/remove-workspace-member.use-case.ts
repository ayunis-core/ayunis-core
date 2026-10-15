import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspaceSharingContextService } from 'src/domain/workspaces/application/services/workspace-sharing-context.service';
import { requireChangeableMember } from 'src/domain/workspaces/application/services/workspace-sharing.guards';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { RemoveWorkspaceMemberCommand } from './remove-workspace-member.command';

@Injectable()
export class RemoveWorkspaceMemberUseCase {
  private readonly logger = new Logger(RemoveWorkspaceMemberUseCase.name);

  constructor(private readonly sharing: WorkspaceSharingContextService) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  @Transactional()
  async execute(
    command: RemoveWorkspaceMemberCommand,
  ): Promise<{ unlinkedCount: number }> {
    this.logger.log(command, 'Removing workspace member');
    const context = await this.sharing.load(command.workspaceId);
    const placement = requireChangeableMember(
      context,
      command.userId,
      command.teamId,
    );
    context.sharing.remove(command.userId, placement, context.directory);
    return this.sharing.save(context);
  }
}
