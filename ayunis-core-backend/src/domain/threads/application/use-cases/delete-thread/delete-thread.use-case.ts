import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { DeleteThreadCommand } from './delete-thread.command';
import { ContextService } from 'src/common/context/services/context.service';
import { ThreadStorageCleanupService } from '../../services/thread-storage-cleanup.service';

@Injectable()
export class DeleteThreadUseCase {
  private readonly logger = new Logger(DeleteThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
    private readonly threadStorageCleanupService: ThreadStorageCleanupService,
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

      // Delete associated storage assets before deleting the thread
      await this.threadStorageCleanupService.cleanupThreadStorage(
        command.id,
        orgId,
      );

      // Delete the thread
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
  }
}
