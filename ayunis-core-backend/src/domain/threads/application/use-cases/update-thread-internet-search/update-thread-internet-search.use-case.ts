import { Injectable, Logger } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { UpdateThreadInternetSearchCommand } from './update-thread-internet-search.command';
import { ThreadUpdateError } from '../../threads.errors';

@Injectable()
export class UpdateThreadInternetSearchUseCase {
  private readonly logger = new Logger(UpdateThreadInternetSearchUseCase.name);

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(command: UpdateThreadInternetSearchCommand): Promise<void> {
    this.logger.log('updateInternetSearch', {
      threadId: command.threadId,
      isInternetSearchEnabled: command.isInternetSearchEnabled,
    });

    try {
      await this.threadsRepository.updateInternetSearch(
        command.threadId,
        command.userId,
        command.isInternetSearchEnabled,
      );
    } catch (error) {
      this.logger.error('Failed to update thread internet search', {
        threadId: command.threadId,
        isInternetSearchEnabled: command.isInternetSearchEnabled,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error instanceof Error
        ? new ThreadUpdateError(command.threadId, error)
        : new ThreadUpdateError(command.threadId, new Error('Unknown error'));
    }
  }
}
