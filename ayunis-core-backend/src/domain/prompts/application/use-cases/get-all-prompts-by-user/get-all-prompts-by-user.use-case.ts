import { Injectable, Logger } from '@nestjs/common';
import { Prompt } from '../../../domain/prompt.entity';
import { PromptsRepository } from '../../ports/prompts.repository';
import { GetAllPromptsByUserQuery } from './get-all-prompts-by-user.query';

@Injectable()
export class GetAllPromptsByUserUseCase {
  private readonly logger = new Logger(GetAllPromptsByUserUseCase.name);

  constructor(private readonly promptsRepository: PromptsRepository) {}

  async execute(query: GetAllPromptsByUserQuery): Promise<Prompt[]> {
    this.logger.log('execute', {
      userId: query.userId,
    });

    const prompts = await this.promptsRepository.findAllByUser(query.userId);
    return prompts;
  }
}
