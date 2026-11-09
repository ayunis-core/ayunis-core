import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceDeletionService } from 'src/domain/workspaces/application/services/workspace-deletion.service';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { DeleteWorkspaceCommand } from './delete-workspace.command';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class DeleteWorkspaceUseCase {
  private readonly logger = new Logger(DeleteWorkspaceUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly workspaceDeletion: WorkspaceDeletionService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: DeleteWorkspaceCommand): Promise<void> {
    this.logger.log({ workspaceId: command.id }, 'Deleting workspace');

    const workspace = await this.workspacesRepository.findById(
      this.resolveUserId(),
      command.id,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError(command.id);
    }

    await this.workspaceDeletion.delete(workspace);
  }

  private resolveUserId(): UUID {
    const { userId } = getRequiredUserContext(this.contextService);
    return userId;
  }
}
