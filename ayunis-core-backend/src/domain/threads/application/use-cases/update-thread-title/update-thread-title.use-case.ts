import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { UpdateThreadTitleCommand } from './update-thread-title.command';
import { ThreadNotFoundError, ThreadUpdateError } from '../../threads.errors';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class UpdateThreadTitleUseCase {
  private readonly logger = new Logger(UpdateThreadTitleUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UpdateThreadTitleCommand): Promise<void> {
    this.logger.log('updateTitle', {
      threadId: command.threadId,
      title: command.title,
    });
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      const thread = await this.threadsRepository.findOne(
        command.threadId,
        userId,
      );
      if (!thread) {
        throw new ThreadNotFoundError(command.threadId, userId);
      }
      await this.threadsRepository.updateTitle({
        threadId: command.threadId,
        userId,
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
