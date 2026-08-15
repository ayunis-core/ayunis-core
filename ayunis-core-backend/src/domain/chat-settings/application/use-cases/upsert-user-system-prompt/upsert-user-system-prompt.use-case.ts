import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UpsertUserSystemPromptCommand } from './upsert-user-system-prompt.command';
import { UserSystemPrompt } from 'src/domain/chat-settings/domain/user-system-prompt.entity';
import { UserSystemPromptsRepository } from '../../ports/user-system-prompts.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from '../../chat-settings.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class UpsertUserSystemPromptUseCase {
  constructor(
    @InjectPinoLogger(UpsertUserSystemPromptUseCase.name)
    private readonly logger: PinoLogger,
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
    this.logger.info({ userId }, 'execute');

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
