import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { runDeferredCleanup } from 'src/common/events/run-deferred-cleanup';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { WorkspaceDeletionService } from 'src/domain/workspaces/application/services/workspace-deletion.service';
import {
  UnexpectedWorkspaceError,
  WorkspaceOwnerOnlyError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { DeleteWorkspaceCommand } from './delete-workspace.command';

@Injectable()
export class DeleteWorkspaceUseCase {
  private readonly logger = new Logger(DeleteWorkspaceUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly access: WorkspaceAccessService,
    private readonly deletion: WorkspaceDeletionService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: DeleteWorkspaceCommand): Promise<void> {
    this.logger.log({ workspaceId: command.id }, 'Deleting workspace');

    const { workspace, level } = await this.access.require(command.id, 'use');
    if (level !== 'owner') {
      throw new WorkspaceOwnerOnlyError(workspace.id);
    }

    // Two-phase cleanup: the workspace's threads go by FK cascade, but their
    // object-storage assets do not. Listeners resolve those while the thread
    // rows still exist and defer the purge until the delete has succeeded.
    const event = await this.deletion.announce(workspace);

    await this.workspacesRepository.delete(workspace.userId, workspace.id);
    await runDeferredCleanup(event.takeCleanupTasks(), this.logger);
  }
}
