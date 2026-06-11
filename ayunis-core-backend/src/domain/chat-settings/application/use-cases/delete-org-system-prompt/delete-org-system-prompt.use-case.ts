import { Injectable, Logger } from '@nestjs/common';
import { OrgSystemPromptsRepository } from '../../ports/org-system-prompts.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from '../../chat-settings.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class DeleteOrgSystemPromptUseCase {
  private readonly logger = new Logger(DeleteOrgSystemPromptUseCase.name);

  constructor(
    private readonly orgSystemPromptsRepository: OrgSystemPromptsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<void> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }
    this.logger.log('execute', { orgId });

    try {
      await this.orgSystemPromptsRepository.deleteByOrgId(orgId);

      this.logger.debug('Org system prompt deleted', { orgId });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to delete org system prompt', error);
      throw new UnexpectedChatSettingsError(error as Error);
    }
  }
}
