import { Injectable, Logger } from '@nestjs/common';
import { OrgChatSettings } from 'src/domain/chat-settings/domain/org-chat-settings.entity';
import { OrgChatSettingsRepository } from 'src/domain/chat-settings/application/ports/org-chat-settings.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from 'src/domain/chat-settings/application/chat-settings.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetOrgChatSettingsUseCase {
  private readonly logger = new Logger(GetOrgChatSettingsUseCase.name);

  constructor(
    private readonly orgChatSettingsRepository: OrgChatSettingsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<OrgChatSettings> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }
    this.logger.log({ orgId }, 'execute');

    try {
      const orgChatSettings =
        await this.orgChatSettingsRepository.findByOrgId(orgId);

      // Fall back to defaults (internet access enabled) when nothing is stored.
      return orgChatSettings ?? new OrgChatSettings({ orgId });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Failed to get org chat settings',
      );
      throw new UnexpectedChatSettingsError(error as Error);
    }
  }
}
