import { Injectable, Logger } from '@nestjs/common';
import { OrgSystemPrompt } from 'src/domain/chat-settings/domain/org-system-prompt.entity';
import { OrgSystemPromptsRepository } from 'src/domain/chat-settings/application/ports/org-system-prompts.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnexpectedChatSettingsError } from 'src/domain/chat-settings/application/chat-settings.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { getRequiredOrgId } from 'src/common/context/required-context';

@Injectable()
export class GetOrgSystemPromptUseCase {
  private readonly logger = new Logger(GetOrgSystemPromptUseCase.name);

  constructor(
    private readonly orgSystemPromptsRepository: OrgSystemPromptsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<OrgSystemPrompt | null> {
    const orgId = getRequiredOrgId(this.contextService);
    this.logger.log({ orgId }, 'execute');

    try {
      const orgSystemPrompt =
        await this.orgSystemPromptsRepository.findByOrgId(orgId);

      if (orgSystemPrompt) {
        this.logger.debug({ orgId }, 'Org system prompt found');
      } else {
        this.logger.debug({ orgId }, 'No org system prompt found');
      }

      return orgSystemPrompt;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error },
        'Failed to get org system prompt',
      );
      throw new UnexpectedChatSettingsError(error as Error);
    }
  }
}
