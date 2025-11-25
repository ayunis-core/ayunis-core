import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { DeleteThreadCommand } from './delete-thread.command';
import { ThreadNotFoundError } from '../../threads.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { DeleteThreadImagesUseCase } from '../delete-thread-images/delete-thread-images.use-case';

@Injectable()
export class DeleteThreadUseCase {
  private readonly logger = new Logger(DeleteThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
    private readonly deleteThreadImagesUseCase: DeleteThreadImagesUseCase,
  ) {}

  async execute(command: DeleteThreadCommand): Promise<void> {
    this.logger.log('delete', { threadId: command.id });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      // First verify the thread exists and belongs to the user
      const thread = await this.threadsRepository.findOne(command.id, userId);

      if (!thread) {
        throw new ThreadNotFoundError(command.id, userId);
      }

      // Delete associated images before deleting the thread
      await this.deleteThreadImagesUseCase.execute(command.id);

      // Delete the thread
      await this.threadsRepository.delete(command.id, userId);

      this.logger.log('Thread deleted successfully', {
        threadId: command.id,
        userId,
      });
    } catch (error) {
      if (error instanceof ThreadNotFoundError) {
        throw error;
      }
      this.logger.error('Failed to delete thread', {
        threadId: command.id,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
