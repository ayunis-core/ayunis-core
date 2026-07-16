import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UpsertOrgChatSettingsCommand } from './upsert-org-chat-settings.command';
import { OrgChatSettings } from '../../../domain/org-chat-settings.entity';
import { OrgChatSettingsRepository } from '../../ports/org-chat-settings.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from '../../chat-settings.errors';

@Injectable()
export class UpsertOrgChatSettingsUseCase {
  private readonly logger = new Logger(UpsertOrgChatSettingsUseCase.name);

  constructor(
    private readonly orgChatSettingsRepository: OrgChatSettingsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedChatSettingsError)
  async execute(
    command: UpsertOrgChatSettingsCommand,
  ): Promise<OrgChatSettings> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }
    this.logger.log('execute', { orgId });

    const orgChatSettings = new OrgChatSettings({
      orgId,
      internetSearchEnabled: command.internetSearchEnabled,
    });

    const result = await this.orgChatSettingsRepository.upsert(orgChatSettings);

    this.logger.debug('Org chat settings upserted', {
      orgId,
      id: result.id,
    });

    return result;
  }
}
