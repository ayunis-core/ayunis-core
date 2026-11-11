import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import { RecordingCleanupService } from 'src/domain/recordings/application/services/recording-cleanup.service';
import { WorkspaceDeletionRequestedEvent } from 'src/domain/workspaces/application/events/workspace-deletion-requested.event';

@Injectable()
export class RecordingsWorkspaceDeletionRequestedListener {
  private readonly logger = new Logger(
    RecordingsWorkspaceDeletionRequestedListener.name,
  );

  constructor(
    private readonly repository: RecordingRepository,
    private readonly cleanup: RecordingCleanupService,
  ) {}

  @OnEvent(WorkspaceDeletionRequestedEvent.EVENT_NAME)
  async handle(event: WorkspaceDeletionRequestedEvent): Promise<void> {
    try {
      const recordings = await this.repository.findAllByWorkspaceId(
        event.workspaceId,
      );
      this.cleanup.deferCleanup(event, recordings, 'workspace');
    } catch (error) {
      this.logger.error(
        { workspaceId: event.workspaceId, err: error as Error },
        'Failed to resolve recordings for workspace deletion',
      );
    }
  }
}
