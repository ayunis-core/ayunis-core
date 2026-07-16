import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserDeletionRequestedEvent } from 'src/iam/users/application/events/user-deletion-requested.event';
import { ThreadsRepository } from '../ports/threads.repository';
import { ThreadStorageCleanupService } from '../services/thread-storage-cleanup.service';

/**
 * Purges object-storage (MinIO) assets owned by a user's threads when the user
 * is being deleted. The thread rows themselves (and their messages, artifacts
 * and generated-image records) are removed by the `threads.userId` FK cascade;
 * this listener only handles the blobs that the database cannot reach.
 *
 * Runs before the row deletion so message and generated-image records are still
 * available to resolve storage keys. Failures are logged, never thrown, so a
 * storage hiccup cannot block user deletion.
 */
@Injectable()
export class ThreadsUserDeletionRequestedListener {
  private readonly logger = new Logger(
    ThreadsUserDeletionRequestedListener.name,
  );

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly threadStorageCleanupService: ThreadStorageCleanupService,
  ) {}

  @OnEvent(UserDeletionRequestedEvent.EVENT_NAME)
  async handleUserDeletionRequested(
    event: UserDeletionRequestedEvent,
  ): Promise<void> {
    try {
      const threadIds = await this.threadsRepository.findAllIdsByUserId(
        event.userId,
      );

      if (threadIds.length === 0) {
        return;
      }

      this.logger.log('Cleaning up thread storage for deleted user', {
        userId: event.userId,
        threadCount: threadIds.length,
      });

      for (const threadId of threadIds) {
        await this.threadStorageCleanupService.cleanupThreadStorage(
          threadId,
          event.orgId,
        );
      }
    } catch (error) {
      this.logger.error('Failed to clean up thread storage for deleted user', {
        userId: event.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
