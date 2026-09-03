import { Injectable, Logger } from '@nestjs/common';
import { UserSystemPromptsRepository } from 'src/domain/chat-settings/application/ports/user-system-prompts.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from 'src/domain/chat-settings/application/chat-settings.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class DeleteUserSystemPromptUseCase {
  private readonly logger = new Logger(DeleteUserSystemPromptUseCase.name);

  constructor(
    private readonly userSystemPromptsRepository: UserSystemPromptsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<void> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }
    this.logger.log({ userId }, 'execute');

    try {
      await this.userSystemPromptsRepository.deleteByUserId(userId);

      this.logger.debug({ userId }, 'User system prompt deleted');
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error },
        'Failed to delete user system prompt',
      );
      throw new UnexpectedChatSettingsError(error as Error);
    }
  }
}
