import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { runDeferredCleanup } from 'src/common/events/run-deferred-cleanup';
import { WorkspaceDeletionRequestedEvent } from 'src/domain/workspaces/application/events/workspace-deletion-requested.event';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';

/**
 * Deletes a workspace once the caller has decided it may go: by a member's
 * request, or because its last member's account was deleted.
 */
@Injectable()
export class WorkspaceDeletionService {
  private readonly logger = new Logger(WorkspaceDeletionService.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async delete(workspace: Workspace): Promise<void> {
    // Two-phase cleanup: the workspace's threads go by FK cascade, but their
    // object-storage assets do not. Listeners resolve those while the thread
    // rows still exist and defer the purge until the delete has succeeded.
    const contextRefs = await this.workspacesRepository.getContextRefs(
      workspace.id,
    );
    const event = new WorkspaceDeletionRequestedEvent(
      workspace.id,
      workspace.orgId,
      contextRefs.skillIds,
    );
    await this.eventEmitter.emitAsync(
      WorkspaceDeletionRequestedEvent.EVENT_NAME,
      event,
    );

    await this.workspacesRepository.delete(workspace.id);
    await runDeferredCleanup(event.takeCleanupTasks(), this.logger);
  }
}
