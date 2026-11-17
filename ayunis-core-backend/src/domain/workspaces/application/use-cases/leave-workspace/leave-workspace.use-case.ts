import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspaceMemberRemovalService } from 'src/domain/workspaces/application/services/workspace-member-removal.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { LeaveWorkspaceCommand } from './leave-workspace.command';

@Injectable()
export class LeaveWorkspaceUseCase {
  private readonly logger = new Logger(LeaveWorkspaceUseCase.name);

  constructor(
    private readonly memberRemoval: WorkspaceMemberRemovalService,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: LeaveWorkspaceCommand): Promise<void> {
    const { workspaceId } = command;
    this.logger.log({ workspaceId }, 'Leaving workspace');
    const { userId } = getRequiredUserContext(this.context);
    await this.memberRemoval.remove(workspaceId, userId);
  }
}
