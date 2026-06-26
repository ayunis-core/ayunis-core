import { Injectable, Logger } from '@nestjs/common';
import { OrgChatSettings } from '../../../domain/org-chat-settings.entity';
import { OrgChatSettingsRepository } from '../../ports/org-chat-settings.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from '../../chat-settings.errors';
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
    this.logger.log('execute', { orgId });

    try {
      const orgChatSettings =
        await this.orgChatSettingsRepository.findByOrgId(orgId);

      // Fall back to defaults (internet access enabled) when nothing is stored.
      return orgChatSettings ?? new OrgChatSettings({ orgId });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to get org chat settings', {
        error: error as Error,
      });
      throw new UnexpectedChatSettingsError(error as Error);
    }
  }
}
