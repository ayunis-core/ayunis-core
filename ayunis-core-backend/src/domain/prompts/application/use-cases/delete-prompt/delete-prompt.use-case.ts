import { Injectable, Logger } from '@nestjs/common';
import { PromptsRepository } from '../../ports/prompts.repository';
import { DeletePromptCommand } from './delete-prompt.command';
import {
  PromptNotFoundError,
  PromptDeletionError,
  PromptError,
} from '../../errors/prompts.errors';

@Injectable()
export class DeletePromptUseCase {
  private readonly logger = new Logger(DeletePromptUseCase.name);

  constructor(private readonly promptsRepository: PromptsRepository) {}

  async execute(command: DeletePromptCommand): Promise<void> {
    this.logger.log('execute', {
      id: command.id,
      userId: command.userId,
    });

    try {
      const existingPrompt = await this.promptsRepository.findOne(
        command.id,
        command.userId,
      );

      if (!existingPrompt) {
        throw new PromptNotFoundError(command.id, command.userId);
      }

      await this.promptsRepository.delete(command.id, command.userId);
    } catch (error) {
      if (error instanceof PromptError) {
        throw error;
      }
      this.logger.error('Failed to delete prompt', {
        id: command.id,
        userId: command.userId,
        error,
      });
      throw error instanceof Error
        ? new PromptDeletionError(error, command.id, command.userId)
        : new PromptDeletionError(
            new Error('Unknown error'),
            command.id,
            command.userId,
          );
    }
  }
}
