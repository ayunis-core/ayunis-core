import { Injectable, Logger } from '@nestjs/common';
import { Prompt } from '../../../domain/prompt.entity';
import { PromptsRepository } from '../../ports/prompts.repository';
import { CreatePromptCommand } from './create-prompt.command';
import { PromptCreationError, PromptError } from '../../errors/prompts.errors';

@Injectable()
export class CreatePromptUseCase {
  private readonly logger = new Logger(CreatePromptUseCase.name);

  constructor(private readonly promptsRepository: PromptsRepository) {}

  async execute(command: CreatePromptCommand): Promise<Prompt> {
    this.logger.log('execute', {
      userId: command.userId,
      title: command.title,
    });

    try {
      const prompt = new Prompt({
        title: command.title,
        content: command.content,
        userId: command.userId,
      });

      const createdPrompt = await this.promptsRepository.create(prompt);
      return createdPrompt;
    } catch (error) {
      if (error instanceof PromptError) {
        throw error;
      }
      this.logger.error('Failed to create prompt', {
        userId: command.userId,
        title: command.title,
        error,
      });
      throw error instanceof Error
        ? new PromptCreationError(error, command.userId)
        : new PromptCreationError(new Error('Unknown error'), command.userId);
    }
  }
}
