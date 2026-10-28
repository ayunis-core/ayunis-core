import { Injectable, Logger } from '@nestjs/common';
import { UpsertOrgSystemPromptCommand } from './upsert-org-system-prompt.command';
import { OrgSystemPrompt } from 'src/domain/chat-settings/domain/org-system-prompt.entity';
import { OrgSystemPromptsRepository } from 'src/domain/chat-settings/application/ports/org-system-prompts.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnexpectedChatSettingsError } from 'src/domain/chat-settings/application/chat-settings.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { getRequiredOrgId } from 'src/common/context/required-context';

@Injectable()
export class UpsertOrgSystemPromptUseCase {
  private readonly logger = new Logger(UpsertOrgSystemPromptUseCase.name);

  constructor(
    private readonly orgSystemPromptsRepository: OrgSystemPromptsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: UpsertOrgSystemPromptCommand,
  ): Promise<OrgSystemPrompt> {
    const orgId = getRequiredOrgId(this.contextService);
    this.logger.log({ orgId }, 'execute');

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
