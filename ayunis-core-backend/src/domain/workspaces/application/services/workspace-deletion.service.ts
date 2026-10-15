import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkspaceDeletionRequestedEvent } from 'src/domain/workspaces/application/events/workspace-deletion-requested.event';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';

@Injectable()
export class WorkspaceDeletionService {
  constructor(
    private readonly repository: WorkspacesRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async announce(
    workspace: Workspace,
  ): Promise<WorkspaceDeletionRequestedEvent> {
    const contextRefs = await this.repository.getContextRefs(workspace.id);
    const event = new WorkspaceDeletionRequestedEvent(
      workspace.id,
      workspace.userId,
      workspace.orgId,
      contextRefs.skillIds,
    );
    await this.eventEmitter.emitAsync(
      WorkspaceDeletionRequestedEvent.EVENT_NAME,
      event,
    );
    return event;
  }
}
