import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UserSystemPromptsRepository } from '../../ports/user-system-prompts.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from '../../chat-settings.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class DeleteUserSystemPromptUseCase {
  constructor(
    @InjectPinoLogger(DeleteUserSystemPromptUseCase.name)
    private readonly logger: PinoLogger,
    private readonly userSystemPromptsRepository: UserSystemPromptsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<void> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }
    this.logger.info({ userId }, 'execute');

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
