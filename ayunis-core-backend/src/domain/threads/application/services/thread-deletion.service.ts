import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { runDeferredCleanup } from 'src/common/events/run-deferred-cleanup';
import { PurgeStoragePrefixesCommand } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.command';
import { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import { ThreadDeletionRequestedEvent } from 'src/domain/threads/application/events/thread-deletion-requested.event';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';

/**
 * Deletes a chat once the caller has decided it may go: at its creator's
 * request, or because it expired under the org's retention policy.
 */
@Injectable()
export class ThreadDeletionService {
  private readonly logger = new Logger(ThreadDeletionService.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly purgeStoragePrefixesUseCase: PurgeStoragePrefixesUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async delete(params: {
    threadId: UUID;
    userId: UUID;
    orgId: UUID;
  }): Promise<void> {
    const { threadId, userId, orgId } = params;
    const event = new ThreadDeletionRequestedEvent(threadId, userId, orgId);
    event.deferCleanup('purge thread storage', () =>
      this.purgeThreadStorage(threadId, orgId),
    );
    await this.eventEmitter.emitAsync(
      ThreadDeletionRequestedEvent.EVENT_NAME,
      event,
    );

    await this.threadsRepository.delete(threadId, userId);
    await runDeferredCleanup(event.takeCleanupTasks(), this.logger);
  }

  // MinIO blobs (message images, generated images) live outside the DB
  // cascade. Purged by key prefix only after the row delete succeeds, so a
  // failed delete never leaves a surviving thread whose blobs are gone; a
  // failed purge is swallowed — it leaks orphaned blobs, which the org-level
  // purge sweeps up when the org is deleted.
  private async purgeThreadStorage(
    threadId: string,
    orgId: string,
  ): Promise<void> {
    try {
      await this.purgeStoragePrefixesUseCase.execute(
        new PurgeStoragePrefixesCommand([
          `${orgId}/${threadId}/`,
          `generated-images/${orgId}/${threadId}/`,
        ]),
      );
    } catch (error) {
      this.logger.error(
        {
          threadId,
          err: error as Error,
        },
        'Failed to purge storage for deleted thread',
      );
    }
  }
}
