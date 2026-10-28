import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { DeleteThreadCommand } from './delete-thread.command';
import { ContextService } from 'src/common/context/services/context.service';
import { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import { PurgeStoragePrefixesCommand } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.command';
import { runDeferredCleanup } from 'src/common/events/run-deferred-cleanup';
import { ThreadDeletionRequestedEvent } from 'src/domain/threads/application/events/thread-deletion-requested.event';

@Injectable()
export class DeleteThreadUseCase {
  private readonly logger = new Logger(DeleteThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
    private readonly purgeStoragePrefixesUseCase: PurgeStoragePrefixesUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: DeleteThreadCommand): Promise<void> {
    this.logger.log({ threadId: command.id }, 'delete');

    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (!orgId) {
      throw new UnauthorizedException('Organization context required');
    }

    const logContext = { threadId: command.id, userId };
    try {
      const thread = await this.threadsRepository.findOne(command.id, userId);

      if (!thread) {
        this.logger.warn(
          logContext,
          'Thread already deleted or not found, treating as success',
        );
        return;
      }

      const event = new ThreadDeletionRequestedEvent(command.id, userId, orgId);
      event.deferCleanup('purge thread storage', () =>
        this.purgeThreadStorage(command.id, orgId),
      );
      await this.eventEmitter.emitAsync(
        ThreadDeletionRequestedEvent.EVENT_NAME,
        event,
      );

      await this.threadsRepository.delete(command.id, userId);
      await runDeferredCleanup(event.takeCleanupTasks(), this.logger);

      this.logger.log(logContext, 'Thread deleted successfully');
    } catch (error) {
      this.logger.error(
        { ...logContext, err: error as Error },
        'Failed to delete thread',
      );
      throw error;
    }
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
