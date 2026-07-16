import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UserSystemPromptsRepository } from '../../ports/user-system-prompts.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from '../../chat-settings.errors';

@Injectable()
export class DeleteUserSystemPromptUseCase {
  private readonly logger = new Logger(DeleteUserSystemPromptUseCase.name);

  constructor(
    private readonly userSystemPromptsRepository: UserSystemPromptsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedChatSettingsError)
  async execute(): Promise<void> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }
    this.logger.log('execute', { userId });

    await this.userSystemPromptsRepository.deleteByUserId(userId);

    this.logger.debug('User system prompt deleted', { userId });
  }
}
