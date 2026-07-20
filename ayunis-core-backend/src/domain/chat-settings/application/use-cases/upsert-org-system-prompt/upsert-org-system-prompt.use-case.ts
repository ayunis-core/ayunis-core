import { Injectable, Logger } from '@nestjs/common';
import { UpsertOrgSystemPromptCommand } from './upsert-org-system-prompt.command';
import { OrgSystemPrompt } from 'src/domain/chat-settings/domain/org-system-prompt.entity';
import { OrgSystemPromptsRepository } from '../../ports/org-system-prompts.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from '../../chat-settings.errors';
import { ApplicationError } from 'src/common/errors/base.error';

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
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }
    this.logger.log('execute', { orgId });

    try {
      const orgSystemPrompt = new OrgSystemPrompt({
        orgId,
        systemPrompt: command.systemPrompt,
      });

      const result =
        await this.orgSystemPromptsRepository.upsert(orgSystemPrompt);

      this.logger.debug('Org system prompt upserted', {
        orgId,
        id: result.id,
      });

      return result;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to upsert org system prompt', error);
      throw new UnexpectedChatSettingsError(error as Error);
    }
  }
}
