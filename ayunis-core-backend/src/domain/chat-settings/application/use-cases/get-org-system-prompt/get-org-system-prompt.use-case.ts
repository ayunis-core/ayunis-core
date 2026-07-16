import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgSystemPrompt } from '../../../domain/org-system-prompt.entity';
import { OrgSystemPromptsRepository } from '../../ports/org-system-prompts.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from '../../chat-settings.errors';

@Injectable()
export class GetOrgSystemPromptUseCase {
  private readonly logger = new Logger(GetOrgSystemPromptUseCase.name);

  constructor(
    private readonly orgSystemPromptsRepository: OrgSystemPromptsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedChatSettingsError)
  async execute(): Promise<OrgSystemPrompt | null> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }
    this.logger.log('execute', { orgId });

    const orgSystemPrompt =
      await this.orgSystemPromptsRepository.findByOrgId(orgId);

    if (orgSystemPrompt) {
      this.logger.debug('Org system prompt found', { orgId });
    } else {
      this.logger.debug('No org system prompt found', { orgId });
    }

    return orgSystemPrompt;
  }
}
