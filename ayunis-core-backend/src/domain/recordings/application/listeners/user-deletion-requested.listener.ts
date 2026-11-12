import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import { RecordingCleanupService } from 'src/domain/recordings/application/services/recording-cleanup.service';
import { UserDeletionRequestedEvent } from 'src/iam/users/application/events/user-deletion-requested.event';

/**
 * A deleted user's personal recordings and those of the workspaces they own go
 * with them; the team and organization recordings they created stay.
 */
@Injectable()
export class RecordingsUserDeletionRequestedListener {
  private readonly logger = new Logger(
    RecordingsUserDeletionRequestedListener.name,
  );

  constructor(
    private readonly repository: RecordingRepository,
    private readonly cleanup: RecordingCleanupService,
  ) {}

  @OnEvent(UserDeletionRequestedEvent.EVENT_NAME)
  async handle(event: UserDeletionRequestedEvent): Promise<void> {
    try {
      const recordings = await this.repository.findAllDeletedWithUser(
        event.userId,
      );
      await this.cleanup.deferCleanup(event, recordings, 'user');
    } catch (error) {
      this.logger.error(
        { userId: event.userId, err: error as Error },
        'Failed to resolve recordings for user deletion',
      );
    }
  }
}
