import { Injectable, Logger } from '@nestjs/common';
import { UpsertUserSystemPromptCommand } from './upsert-user-system-prompt.command';
import { UserSystemPrompt } from 'src/domain/chat-settings/domain/user-system-prompt.entity';
import { UserSystemPromptsRepository } from 'src/domain/chat-settings/application/ports/user-system-prompts.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnexpectedChatSettingsError } from 'src/domain/chat-settings/application/chat-settings.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { getRequiredUserContext } from 'src/common/context/required-context';

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
    const { userId } = getRequiredUserContext(this.contextService);
    this.logger.log({ userId }, 'execute');

    try {
      const userSystemPrompt = new UserSystemPrompt({
        userId,
        systemPrompt: command.systemPrompt,
      });

      const result =
        await this.userSystemPromptsRepository.upsert(userSystemPrompt);

      this.logger.debug(
        {
          userId,
          id: result.id,
        },
        'User system prompt upserted',
      );

      return result;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error },
        'Failed to upsert user system prompt',
      );
      throw new UnexpectedChatSettingsError(error as Error);
    }
  }
}
