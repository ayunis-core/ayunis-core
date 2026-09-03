import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { FavoriteReferenceType } from 'src/domain/favorites/domain/value-objects/favorite-reference-type.enum';
import { RemoveFavoriteReferenceCommand } from 'src/domain/favorites/application/use-cases/remove-favorite-reference/remove-favorite-reference.command';
import { RemoveFavoriteReferenceUseCase } from 'src/domain/favorites/application/use-cases/remove-favorite-reference/remove-favorite-reference.use-case';
import { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import { PurgeStoragePrefixesCommand } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.command';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { WorkspaceDeletionRequestedEvent } from 'src/domain/workspaces/application/events/workspace-deletion-requested.event';

/**
 * Cleans up object-storage (MinIO) assets owned by a workspace's threads when
 * the workspace is being deleted. The thread rows themselves (and their
 * messages, artifacts and generated-image records) are removed by the
 * `threads.workspaceId` FK cascade; only the blobs and pinned-thread
 * favorite rows need explicit cleanup because favorites have no FK to threads.
 *
 * Thread ids are resolved here, before the row delete, while the thread rows
 * still exist; the blobs are then purged by key prefix, which needs no rows —
 * so the purge itself is deferred until after the row delete succeeds. The
 * deferred task re-checks which of the snapshotted threads still exist: a
 * chat moved out of the workspace between the snapshot and the delete
 * survives the cascade and must keep its blobs and favorites. Failures are
 * logged, never thrown, so a lookup error cannot block the workspace
 * deletion.
 */
@Injectable()
export class ThreadsWorkspaceDeletionRequestedListener {
  private readonly logger = new Logger(
    ThreadsWorkspaceDeletionRequestedListener.name,
  );

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly purgeStoragePrefixesUseCase: PurgeStoragePrefixesUseCase,
    private readonly removeFavoriteReferenceUseCase: RemoveFavoriteReferenceUseCase,
  ) {}

  @OnEvent(WorkspaceDeletionRequestedEvent.EVENT_NAME)
  async handleWorkspaceDeletionRequested(
    event: WorkspaceDeletionRequestedEvent,
  ): Promise<void> {
    try {
      const threadIds = await this.threadsRepository.findAllIdsByWorkspaceId(
        event.workspaceId,
      );

      if (threadIds.length === 0) {
        return;
      }

      this.logger.log(
        {
          workspaceId: event.workspaceId,
          threadCount: threadIds.length,
        },
        'Deferring thread storage cleanup for deleted workspace',
      );

      event.deferCleanup('clean up cascaded workspace threads', () =>
        this.cleanUpDeletedThreads(threadIds, event.orgId),
      );
    } catch (error) {
      this.logger.error(
        {
          workspaceId: event.workspaceId,
          err: error as Error,
        },
        'Failed to resolve thread storage for deleted workspace',
      );
    }
  }

  private async cleanUpDeletedThreads(
    threadIds: UUID[],
    orgId: UUID,
  ): Promise<void> {
    const surviving = new Set(
      await this.threadsRepository.filterExistingIds(threadIds),
    );
    const deletedIds = threadIds.filter((id) => !surviving.has(id));
    if (deletedIds.length === 0) {
      return;
    }

    await this.purgeStoragePrefixesUseCase.execute(
      new PurgeStoragePrefixesCommand(
        deletedIds.flatMap((threadId) => [
          `${orgId}/${threadId}/`,
          `generated-images/${orgId}/${threadId}/`,
        ]),
      ),
    );
    for (const threadId of deletedIds) {
      await this.removeFavoriteReferenceUseCase.execute(
        new RemoveFavoriteReferenceCommand(
          FavoriteReferenceType.Thread,
          threadId,
        ),
      );
    }
  }
}
