import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserDeletionRequestedEvent } from 'src/iam/users/application/events/user-deletion-requested.event';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import { PurgeStoragePrefixesCommand } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.command';
import { DeleteUnreferencedSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-unreferenced-sources/delete-unreferenced-sources.use-case';
import { DeleteUnreferencedSourcesCommand } from 'src/domain/sources/application/use-cases/delete-unreferenced-sources/delete-unreferenced-sources.command';

/**
 * Cleans up what the `threads.userId` FK cascade cannot reach when a user is
 * deleted. The thread rows themselves (and their messages, artifacts and
 * generated-image records) go with the cascade; two things need explicit work:
 *
 * - Object-storage (MinIO) blobs under the thread prefixes
 *   (`<orgId>/<threadId>/` for message images,
 *   `generated-images/<orgId>/<threadId>/` for generated images).
 * - Sources uploaded into those threads. They have no owner FK, so the cascade
 *   only removes their assignment rows and the stale-source sweep, which starts
 *   from assignments, never sees them again; their indexes and retained
 *   originals would stay until the org is deleted.
 *
 * Both are resolved here, before the row delete, while the thread rows still
 * exist, and the irreversible work is deferred until after the delete
 * succeeds. Failures are logged, never thrown, so a lookup error cannot block
 * user deletion.
 */
@Injectable()
export class ThreadsUserDeletionRequestedListener {
  private readonly logger = new Logger(
    ThreadsUserDeletionRequestedListener.name,
  );

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly purgeStoragePrefixesUseCase: PurgeStoragePrefixesUseCase,
    private readonly deleteUnreferencedSourcesUseCase: DeleteUnreferencedSourcesUseCase,
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

      const sourceIds =
        await this.threadsRepository.findDirectSourceIdsByUserId(event.userId);

      this.logger.log(
        {
          userId: event.userId,
          threadCount: threadIds.length,
          sourceCount: sourceIds.length,
        },
        'Deferring thread storage cleanup for deleted user',
      );

      const prefixes = threadIds.flatMap((threadId) => [
        `${event.orgId}/${threadId}/`,
        `generated-images/${event.orgId}/${threadId}/`,
      ]);
      event.deferCleanup('purge thread storage', async () => {
        await this.purgeStoragePrefixesUseCase.execute(
          new PurgeStoragePrefixesCommand(prefixes),
        );
      });
      if (sourceIds.length > 0) {
        event.deferCleanup('delete thread sources', async () => {
          await this.deleteUnreferencedSourcesUseCase.execute(
            new DeleteUnreferencedSourcesCommand(sourceIds, event.orgId),
          );
        });
      }
    } catch (error) {
      this.logger.error(
        {
          userId: event.userId,
          err: error as Error,
        },
        'Failed to resolve thread storage for deleted user',
      );
    }
  }
}
