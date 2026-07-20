import { Injectable, Logger } from '@nestjs/common';
import { OrgSystemPrompt } from 'src/domain/chat-settings/domain/org-system-prompt.entity';
import { OrgSystemPromptsRepository } from '../../ports/org-system-prompts.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from '../../chat-settings.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetOrgSystemPromptUseCase {
  private readonly logger = new Logger(GetOrgSystemPromptUseCase.name);

  constructor(
    private readonly orgSystemPromptsRepository: OrgSystemPromptsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<OrgSystemPrompt | null> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }
    this.logger.log('execute', { orgId });

    try {
      const orgSystemPrompt =
        await this.orgSystemPromptsRepository.findByOrgId(orgId);

      if (orgSystemPrompt) {
        this.logger.debug('Org system prompt found', { orgId });
      } else {
        this.logger.debug('No org system prompt found', { orgId });
      }

      return orgSystemPrompt;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to get org system prompt', error);
      throw new UnexpectedChatSettingsError(error as Error);
    }
  }
}
