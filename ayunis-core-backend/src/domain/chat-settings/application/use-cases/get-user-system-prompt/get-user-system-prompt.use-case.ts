import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UserSystemPrompt } from 'src/domain/chat-settings/domain/user-system-prompt.entity';
import { UserSystemPromptsRepository } from '../../ports/user-system-prompts.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from '../../chat-settings.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetUserSystemPromptUseCase {
  constructor(
    @InjectPinoLogger(GetUserSystemPromptUseCase.name)
    private readonly logger: PinoLogger,
    private readonly userSystemPromptsRepository: UserSystemPromptsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<UserSystemPrompt | null> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }
    this.logger.info({ userId }, 'execute');

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
