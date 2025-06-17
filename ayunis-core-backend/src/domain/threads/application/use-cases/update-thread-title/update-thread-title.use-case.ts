import { Injectable, Logger, Inject } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { UpdateThreadTitleCommand } from './update-thread-title.command';
import { ThreadUpdateError } from '../../threads.errors';

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
      await this.threadsRepository.updateTitle(
        command.threadId,
        command.userId,
        command.title,
      );
    } catch (error) {
      this.logger.error('Failed to update thread title', {
        threadId: command.threadId,
        title: command.title,
        error,
      });
      throw error instanceof Error
        ? new ThreadUpdateError(command.threadId, error)
        : new ThreadUpdateError(command.threadId, new Error('Unknown error'));
    }
  }
}
