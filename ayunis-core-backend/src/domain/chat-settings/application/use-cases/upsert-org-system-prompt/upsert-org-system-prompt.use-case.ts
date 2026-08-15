import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UpsertOrgSystemPromptCommand } from './upsert-org-system-prompt.command';
import { OrgSystemPrompt } from 'src/domain/chat-settings/domain/org-system-prompt.entity';
import { OrgSystemPromptsRepository } from '../../ports/org-system-prompts.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from '../../chat-settings.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class UpsertOrgSystemPromptUseCase {
  constructor(
    @InjectPinoLogger(UpsertOrgSystemPromptUseCase.name)
    private readonly logger: PinoLogger,
    private readonly orgSystemPromptsRepository: OrgSystemPromptsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: UpsertOrgSystemPromptCommand,
  ): Promise<OrgSystemPrompt> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }
    this.logger.info({ orgId }, 'execute');

    try {
      const orgSystemPrompt = new OrgSystemPrompt({
        orgId,
        systemPrompt: command.systemPrompt,
      });

      const result =
        await this.orgSystemPromptsRepository.upsert(orgSystemPrompt);

      this.logger.debug(
        {
          orgId,
          id: result.id,
        },
        'Org system prompt upserted',
      );

      return result;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error },
        'Failed to upsert org system prompt',
      );
      throw new UnexpectedChatSettingsError(error as Error);
    }
  }
}
