import { Injectable, Logger } from '@nestjs/common';
import { Prompt } from '../../../domain/prompt.entity';
import { PromptsRepository } from '../../ports/prompts.repository';
import { GetPromptQuery } from './get-prompt.query';
import { PromptNotFoundError } from '../../errors/prompts.errors';

@Injectable()
export class GetPromptUseCase {
  private readonly logger = new Logger(GetPromptUseCase.name);

  constructor(private readonly promptsRepository: PromptsRepository) {}

  async execute(query: GetPromptQuery): Promise<Prompt> {
    this.logger.log('execute', {
      id: query.id,
      userId: query.userId,
    });

    const prompt = await this.promptsRepository.findOne(query.id, query.userId);

    if (!prompt) {
      throw new PromptNotFoundError(query.id, query.userId);
    }

    return prompt;
  }
}
