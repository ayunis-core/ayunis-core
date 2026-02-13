import { Injectable, Logger } from '@nestjs/common';
import { UpsertUserSystemPromptCommand } from './upsert-user-system-prompt.command';
import { UserSystemPrompt } from '../../../domain/user-system-prompt.entity';
import { UserSystemPromptsRepository } from '../../ports/user-system-prompts.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from '../../chat-settings.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class UpsertUserSystemPromptUseCase {
  private readonly logger = new Logger(UpsertUserSystemPromptUseCase.name);

  constructor(
    private readonly userSystemPromptsRepository: UserSystemPromptsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: UpsertUserSystemPromptCommand,
  ): Promise<UserSystemPrompt> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }
    this.logger.log('execute', { userId });

    try {
      const userSystemPrompt = new UserSystemPrompt({
        userId,
        systemPrompt: command.systemPrompt,
      });

      const result =
        await this.userSystemPromptsRepository.upsert(userSystemPrompt);

      this.logger.debug('User system prompt upserted', {
        userId,
        id: result.id,
      });

      return result;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to upsert user system prompt', error);
      throw new UnexpectedChatSettingsError(error as Error);
    }
  }
}
