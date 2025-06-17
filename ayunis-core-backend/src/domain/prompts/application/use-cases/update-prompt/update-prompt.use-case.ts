import { Injectable, Logger } from '@nestjs/common';
import { Prompt } from '../../../domain/prompt.entity';
import { PromptsRepository } from '../../ports/prompts.repository';
import { UpdatePromptCommand } from './update-prompt.command';
import {
  PromptNotFoundError,
  PromptUpdateError,
  PromptError,
} from '../../errors/prompts.errors';

@Injectable()
export class UpdatePromptUseCase {
  private readonly logger = new Logger(UpdatePromptUseCase.name);

  constructor(private readonly promptsRepository: PromptsRepository) {}

  async execute(command: UpdatePromptCommand): Promise<Prompt> {
    this.logger.log('execute', {
      id: command.id,
      userId: command.userId,
      title: command.title,
    });

    try {
      const existingPrompt = await this.promptsRepository.findOne(
        command.id,
        command.userId,
      );

      if (!existingPrompt) {
        throw new PromptNotFoundError(command.id, command.userId);
      }

      const updatedPrompt = new Prompt({
        id: command.id,
        title: command.title,
        content: command.content,
        userId: command.userId,
        createdAt: existingPrompt.createdAt,
        updatedAt: new Date(),
      });

      const result = await this.promptsRepository.update(updatedPrompt);
      return result;
    } catch (error) {
      if (error instanceof PromptError) {
        throw error;
      }
      this.logger.error('Failed to update prompt', {
        id: command.id,
        userId: command.userId,
        error,
      });
      throw error instanceof Error
        ? new PromptUpdateError(error, command.id, command.userId)
        : new PromptUpdateError(
            new Error('Unknown error'),
            command.id,
            command.userId,
          );
    }
  }
}
