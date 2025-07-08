import { Injectable, Logger } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { DeleteThreadCommand } from './delete-thread.command';
import { ThreadNotFoundError } from '../../threads.errors';

@Injectable()
export class DeleteThreadUseCase {
  private readonly logger = new Logger(DeleteThreadUseCase.name);

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(command: DeleteThreadCommand): Promise<void> {
    this.logger.log('delete', { threadId: command.id, userId: command.userId });

    try {
      // First verify the thread exists and belongs to the user
      const thread = await this.threadsRepository.findOne(
        command.id,
        command.userId,
      );

      if (!thread) {
        throw new ThreadNotFoundError(command.id, command.userId);
      }

      // Delete the thread
      await this.threadsRepository.delete(command.id, command.userId);

      this.logger.log('Thread deleted successfully', {
        threadId: command.id,
        userId: command.userId,
      });
    } catch (error) {
      if (error instanceof ThreadNotFoundError) {
        throw error;
      }
      this.logger.error('Failed to delete thread', {
        threadId: command.id,
        userId: command.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
