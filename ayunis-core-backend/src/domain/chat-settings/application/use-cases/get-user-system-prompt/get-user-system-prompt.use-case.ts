import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UserSystemPrompt } from '../../../domain/user-system-prompt.entity';
import { UserSystemPromptsRepository } from '../../ports/user-system-prompts.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from '../../chat-settings.errors';

@Injectable()
export class GetUserSystemPromptUseCase {
  private readonly logger = new Logger(GetUserSystemPromptUseCase.name);

  constructor(
    private readonly userSystemPromptsRepository: UserSystemPromptsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedChatSettingsError)
  async execute(): Promise<UserSystemPrompt | null> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }
    this.logger.log('execute', { userId });

    const userSystemPrompt =
      await this.userSystemPromptsRepository.findByUserId(userId);

    if (userSystemPrompt) {
      this.logger.debug('User system prompt found', { userId });
    } else {
      this.logger.debug('No user system prompt found', { userId });
    }

    return userSystemPrompt;
  }
}
