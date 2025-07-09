import { Injectable, Logger } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { UpdateThreadTitleCommand } from './update-thread-title.command';
import { ThreadNotFoundError, ThreadUpdateError } from '../../threads.errors';

@Injectable()
export class UpdateThreadTitleUseCase {
  private readonly logger = new Logger(UpdateThreadTitleUseCase.name);

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(command: UpdateThreadTitleCommand): Promise<void> {
    this.logger.log('updateTitle', {
      threadId: command.threadId,
      title: command.title,
    });

    try {
      const thread = await this.threadsRepository.findOne(
        command.threadId,
        command.userId,
      );
      if (!thread) {
        throw new ThreadNotFoundError(command.threadId, command.userId);
      }
      await this.threadsRepository.updateTitle({
        threadId: command.threadId,
        userId: command.userId,
        title: command.title,
      });
    } catch (error) {
      this.logger.error('Failed to update thread title', {
        threadId: command.threadId,
        title: command.title,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error instanceof Error
        ? new ThreadUpdateError(command.threadId, error)
        : new ThreadUpdateError(command.threadId, new Error('Unknown error'));
    }
  }
}
