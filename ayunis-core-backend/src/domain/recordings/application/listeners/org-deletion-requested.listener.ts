import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import { RecordingCleanupService } from 'src/domain/recordings/application/services/recording-cleanup.service';
import { OrgDeletionRequestedEvent } from 'src/iam/orgs/application/events/org-deletion-requested.event';

@Injectable()
export class RecordingsOrgDeletionRequestedListener {
  private readonly logger = new Logger(
    RecordingsOrgDeletionRequestedListener.name,
  );

  constructor(
    private readonly repository: RecordingRepository,
    private readonly cleanup: RecordingCleanupService,
  ) {}

  @OnEvent(OrgDeletionRequestedEvent.EVENT_NAME)
  async handle(event: OrgDeletionRequestedEvent): Promise<void> {
    try {
      const recordings = await this.repository.findAllByOrgId(event.orgId);
      await this.cleanup.deferCleanup(event, recordings, 'organization');
    } catch (error) {
      this.logger.error(
        { orgId: event.orgId, err: error as Error },
        'Failed to resolve recordings for organization deletion',
      );
    }
  }
}
