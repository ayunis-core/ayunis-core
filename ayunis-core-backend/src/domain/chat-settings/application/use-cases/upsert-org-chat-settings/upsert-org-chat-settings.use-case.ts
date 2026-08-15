import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UpsertOrgChatSettingsCommand } from './upsert-org-chat-settings.command';
import { OrgChatSettings } from 'src/domain/chat-settings/domain/org-chat-settings.entity';
import { OrgChatSettingsRepository } from '../../ports/org-chat-settings.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from '../../chat-settings.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class UpsertOrgChatSettingsUseCase {
  constructor(
    @InjectPinoLogger(UpsertOrgChatSettingsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly orgChatSettingsRepository: OrgChatSettingsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: UpsertOrgChatSettingsCommand,
  ): Promise<OrgChatSettings> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }
    this.logger.info({ orgId }, 'execute');

    try {
      const orgChatSettings = new OrgChatSettings({
        orgId,
        internetSearchEnabled: command.internetSearchEnabled,
      });

      const result =
        await this.orgChatSettingsRepository.upsert(orgChatSettings);

      this.logger.debug(
        {
          orgId,
          id: result.id,
        },
        'Org chat settings upserted',
      );

      return result;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Failed to upsert org chat settings',
      );
      throw new UnexpectedChatSettingsError(error as Error);
    }
  }
}
