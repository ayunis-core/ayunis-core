import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { runDeferredCleanup } from 'src/common/events/run-deferred-cleanup';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceDeletionRequestedEvent } from 'src/domain/workspaces/application/events/workspace-deletion-requested.event';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { DeleteWorkspaceCommand } from './delete-workspace.command';

@Injectable()
export class DeleteWorkspaceUseCase {
  private readonly logger = new Logger(DeleteWorkspaceUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly contextService: ContextService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: DeleteWorkspaceCommand): Promise<void> {
    this.logger.log('Deleting workspace', { workspaceId: command.id });

    const userId = this.resolveUserId();
    const workspace = await this.workspacesRepository.findById(
      userId,
      command.id,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError(command.id);
    }

    // Two-phase cleanup: the workspace's threads go by FK cascade, but their
    // object-storage assets do not. Listeners resolve those while the thread
    // rows still exist and defer the purge until the delete has succeeded.
    const event = new WorkspaceDeletionRequestedEvent(
      workspace.id,
      workspace.userId,
      workspace.orgId,
    );
    await this.eventEmitter.emitAsync(
      WorkspaceDeletionRequestedEvent.EVENT_NAME,
      event,
    );

    await this.workspacesRepository.delete(userId, command.id);

    await runDeferredCleanup(event.takeCleanupTasks(), this.logger);
  }

  private resolveUserId(): UUID {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }
    return userId;
  }
}
