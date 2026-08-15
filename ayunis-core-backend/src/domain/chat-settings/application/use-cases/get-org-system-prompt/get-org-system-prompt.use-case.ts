import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { OrgSystemPrompt } from 'src/domain/chat-settings/domain/org-system-prompt.entity';
import { OrgSystemPromptsRepository } from '../../ports/org-system-prompts.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from '../../chat-settings.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetOrgSystemPromptUseCase {
  constructor(
    @InjectPinoLogger(GetOrgSystemPromptUseCase.name)
    private readonly logger: PinoLogger,
    private readonly orgSystemPromptsRepository: OrgSystemPromptsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<OrgSystemPrompt | null> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }
    this.logger.info({ orgId }, 'execute');

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
