import { Injectable, Logger } from '@nestjs/common';
import { UserSystemPrompt } from 'src/domain/chat-settings/domain/user-system-prompt.entity';
import { UserSystemPromptsRepository } from 'src/domain/chat-settings/application/ports/user-system-prompts.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnexpectedChatSettingsError } from 'src/domain/chat-settings/application/chat-settings.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class GetUserSystemPromptUseCase {
  private readonly logger = new Logger(GetUserSystemPromptUseCase.name);

  constructor(
    private readonly userSystemPromptsRepository: UserSystemPromptsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<UserSystemPrompt | null> {
    const { userId } = getRequiredUserContext(this.contextService);
    this.logger.log({ userId }, 'execute');

    try {
      const userSystemPrompt =
        await this.userSystemPromptsRepository.findByUserId(userId);

      if (userSystemPrompt) {
        this.logger.debug({ userId }, 'User system prompt found');
      } else {
        this.logger.debug({ userId }, 'No user system prompt found');
      }

      return userSystemPrompt;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error },
        'Failed to get user system prompt',
      );
      throw new UnexpectedChatSettingsError(error as Error);
    }
  }
}
