import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { OrgChatSettings } from 'src/domain/chat-settings/domain/org-chat-settings.entity';
import { OrgChatSettingsRepository } from '../../ports/org-chat-settings.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from '../../chat-settings.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetOrgChatSettingsUseCase {
  constructor(
    @InjectPinoLogger(GetOrgChatSettingsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly orgChatSettingsRepository: OrgChatSettingsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(): Promise<OrgChatSettings> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }
    this.logger.info({ orgId }, 'execute');

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
