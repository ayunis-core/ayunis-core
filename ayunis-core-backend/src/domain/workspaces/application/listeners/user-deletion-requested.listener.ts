import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceDeletionService } from 'src/domain/workspaces/application/services/workspace-deletion.service';
import { WorkspaceDirectoryService } from 'src/domain/workspaces/application/services/workspace-directory.service';
import { WorkspaceOwnershipService } from 'src/domain/workspaces/application/services/workspace-ownership.service';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { UserDeletionRequestedEvent } from 'src/iam/users/application/events/user-deletion-requested.event';

@Injectable()
export class WorkspacesUserDeletionRequestedListener {
  private readonly logger = new Logger(
    WorkspacesUserDeletionRequestedListener.name,
  );

  constructor(
    private readonly repository: WorkspacesRepository,
    private readonly directoryService: WorkspaceDirectoryService,
    private readonly ownership: WorkspaceOwnershipService,
    private readonly deletion: WorkspaceDeletionService,
  ) {}

  @OnEvent(UserDeletionRequestedEvent.EVENT_NAME, { suppressErrors: false })
  async handle(event: UserDeletionRequestedEvent): Promise<void> {
    const owned = await this.repository.findAllOwnedBy(event.userId);
    if (owned.length === 0) return;
    const directory = await this.directoryService.loadForOrg(event.orgId);
    for (const { id } of owned) {
      const outcome = await this.ownership.handOverFrom(
        id,
        event.userId,
        directory,
      );
      if (outcome.type === 'handed-over') {
        this.logger.log(
          { workspaceId: id, successorId: outcome.successorId },
          'Handed workspace over before its owner is deleted',
        );
      } else if (outcome.type === 'stays-alone') {
        await this.deferCleanupOf(outcome.workspace, event);
      }
    }
  }

  private async deferCleanupOf(
    workspace: Workspace,
    event: UserDeletionRequestedEvent,
  ): Promise<void> {
    const deletion = await this.deletion.announce(workspace);
    for (const task of deletion.takeCleanupTasks()) {
      event.deferCleanup(task.label, async () => {
        if (await this.repository.findOne(workspace.id)) return;
        await task.run();
      });
    }
  }
}
