import { Injectable, Logger } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { UpdateThreadModelCommand } from './update-thread-model.command';
import { ThreadNotFoundError, ThreadUpdateError } from '../../threads.errors';

@Injectable()
export class UpdateThreadModelUseCase {
  private readonly logger = new Logger(UpdateThreadModelUseCase.name);

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async execute(command: UpdateThreadModelCommand): Promise<void> {
    this.logger.log('updateModel', {
      threadId: command.threadId,
      modelId: command.modelId,
    });

    try {
      const thread = await this.threadsRepository.findOne(
        command.threadId,
        command.userId,
      );
      if (!thread) {
        throw new ThreadNotFoundError(command.threadId, command.userId);
      }
      await this.threadsRepository.updateModel({
        threadId: command.threadId,
        userId: command.userId,
        permittedModelId: command.modelId,
      });
    } catch (error) {
      this.logger.error('Failed to update thread model', {
        threadId: command.threadId,
        modelId: command.modelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error instanceof Error
        ? new ThreadUpdateError(command.threadId, error)
        : new ThreadUpdateError(command.threadId, new Error('Unknown error'));
    }
  }
}
