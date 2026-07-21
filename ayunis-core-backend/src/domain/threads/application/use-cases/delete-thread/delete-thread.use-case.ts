import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { DeleteThreadCommand } from './delete-thread.command';
import { ContextService } from 'src/common/context/services/context.service';
import { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import { PurgeStoragePrefixesCommand } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.command';

@Injectable()
export class DeleteThreadUseCase {
  private readonly logger = new Logger(DeleteThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
    private readonly purgeStoragePrefixesUseCase: PurgeStoragePrefixesUseCase,
  ) {}

  async execute(command: DeleteThreadCommand): Promise<void> {
    this.logger.log('delete', { threadId: command.id });

    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (!orgId) {
      throw new UnauthorizedException('Organization context required');
    }

    try {
      // First verify the thread exists and belongs to the user
      const thread = await this.threadsRepository.findOne(command.id, userId);

      if (!thread) {
        // Idempotent delete: treat already-deleted threads as success
        this.logger.warn(
          'Thread already deleted or not found, treating as success',
          {
            threadId: command.id,
            userId,
          },
        );
        return;
      }

      await this.threadsRepository.delete(command.id, userId);

      this.logger.log('Thread deleted successfully', {
        threadId: command.id,
        userId,
      });
    } catch (error) {
      this.logger.error('Failed to delete thread', {
        threadId: command.id,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }

    await this.purgeThreadStorage(command.id, orgId);
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
      this.logger.error('Failed to purge storage for deleted thread', {
        threadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
