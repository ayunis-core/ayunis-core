import { Injectable, Logger } from '@nestjs/common';
import { UserSystemPrompt } from '../../../domain/user-system-prompt.entity';
import { UserSystemPromptsRepository } from '../../ports/user-system-prompts.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from '../../chat-settings.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetUserSystemPromptUseCase {
  private readonly logger = new Logger(GetUserSystemPromptUseCase.name);

  constructor(
    private readonly userSystemPromptsRepository: UserSystemPromptsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<UserSystemPrompt | null> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }
    this.logger.log('execute', { userId });

    try {
      const userSystemPrompt =
        await this.userSystemPromptsRepository.findByUserId(userId);

      if (userSystemPrompt) {
        this.logger.debug('User system prompt found', { userId });
      } else {
        this.logger.debug('No user system prompt found', { userId });
      }

      return userSystemPrompt;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to get user system prompt', error);
      throw new UnexpectedChatSettingsError(error as Error);
    }
  }
}
