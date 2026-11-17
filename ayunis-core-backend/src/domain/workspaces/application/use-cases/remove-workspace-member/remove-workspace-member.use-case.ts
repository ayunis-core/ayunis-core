import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspaceMemberRemovalService } from 'src/domain/workspaces/application/services/workspace-member-removal.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { RemoveWorkspaceMemberCommand } from './remove-workspace-member.command';

@Injectable()
export class RemoveWorkspaceMemberUseCase {
  private readonly logger = new Logger(RemoveWorkspaceMemberUseCase.name);

  constructor(private readonly memberRemoval: WorkspaceMemberRemovalService) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: RemoveWorkspaceMemberCommand): Promise<void> {
    const { workspaceId, userId } = command;
    this.logger.log({ workspaceId, userId }, 'Removing workspace member');
    await this.memberRemoval.remove(workspaceId, userId);
  }
}
