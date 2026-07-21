import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserDeletionRequestedEvent } from 'src/iam/users/application/events/user-deletion-requested.event';
import { ThreadsRepository } from '../ports/threads.repository';
import { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import { PurgeStoragePrefixesCommand } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.command';

/**
 * Cleans up object-storage (MinIO) assets owned by a user's threads when the
 * user is being deleted. The thread rows themselves (and their messages,
 * artifacts and generated-image records) are removed by the `threads.userId`
 * FK cascade; only the blobs need explicit cleanup.
 *
 * Thread ids are resolved here, before the row delete, while the thread rows
 * still exist; the blobs are then purged by key prefix (`<orgId>/<threadId>/`
 * for message images, `generated-images/<orgId>/<threadId>/` for generated
 * images), which needs no rows — so the purge itself is deferred until after
 * the row delete succeeds. Failures are logged, never thrown, so a lookup
 * error cannot block user deletion.
 */
@Injectable()
export class ThreadsUserDeletionRequestedListener {
  private readonly logger = new Logger(
    ThreadsUserDeletionRequestedListener.name,
  );

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly purgeStoragePrefixesUseCase: PurgeStoragePrefixesUseCase,
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

      this.logger.log('Deferring thread storage cleanup for deleted user', {
        userId: event.userId,
        threadCount: threadIds.length,
      });

      const prefixes = threadIds.flatMap((threadId) => [
        `${event.orgId}/${threadId}/`,
        `generated-images/${event.orgId}/${threadId}/`,
      ]);
      event.deferCleanup('purge thread storage', async () => {
        await this.purgeStoragePrefixesUseCase.execute(
          new PurgeStoragePrefixesCommand(prefixes),
        );
      });
    } catch (error) {
      this.logger.error('Failed to resolve thread storage for deleted user', {
        userId: event.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
