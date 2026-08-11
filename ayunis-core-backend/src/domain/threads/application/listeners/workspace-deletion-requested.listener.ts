import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WorkspaceDeletionRequestedEvent } from 'src/domain/workspaces/application/events/workspace-deletion-requested.event';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import { PurgeStoragePrefixesCommand } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.command';

/**
 * Cleans up object-storage (MinIO) assets owned by a workspace's threads when
 * the workspace is being deleted. The thread rows themselves (and their
 * messages, artifacts and generated-image records) are removed by the
 * `threads.workspaceId` FK cascade; only the blobs need explicit cleanup.
 *
 * Thread ids are resolved here, before the row delete, while the thread rows
 * still exist; the blobs are then purged by key prefix, which needs no rows —
 * so the purge itself is deferred until after the row delete succeeds.
 * Failures are logged, never thrown, so a lookup error cannot block the
 * workspace deletion.
 */
@Injectable()
export class ThreadsWorkspaceDeletionRequestedListener {
  private readonly logger = new Logger(
    ThreadsWorkspaceDeletionRequestedListener.name,
  );

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly purgeStoragePrefixesUseCase: PurgeStoragePrefixesUseCase,
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
        'Deferring thread storage cleanup for deleted workspace',
        {
          workspaceId: event.workspaceId,
          threadCount: threadIds.length,
        },
      );

      const prefixes = threadIds.flatMap((threadId) => [
        `${event.orgId}/${threadId}/`,
        `generated-images/${event.orgId}/${threadId}/`,
      ]);
      event.deferCleanup('purge workspace thread storage', async () => {
        await this.purgeStoragePrefixesUseCase.execute(
          new PurgeStoragePrefixesCommand(prefixes),
        );
      });
    } catch (error) {
      this.logger.error(
        'Failed to resolve thread storage for deleted workspace',
        {
          workspaceId: event.workspaceId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
    }
  }
}
