import { Injectable, Logger } from '@nestjs/common';
import { OrgSystemPromptsRepository } from 'src/domain/chat-settings/application/ports/org-system-prompts.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from 'src/domain/chat-settings/application/chat-settings.errors';
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
    this.logger.log({ orgId }, 'execute');

    try {
      await this.orgSystemPromptsRepository.deleteByOrgId(orgId);

      this.logger.debug({ orgId }, 'Org system prompt deleted');
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error },
        'Failed to delete org system prompt',
      );
      throw new UnexpectedChatSettingsError(error as Error);
    }
  }
}
