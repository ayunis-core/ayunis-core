import { Injectable, Logger } from '@nestjs/common';
import { UpsertOrgChatSettingsCommand } from './upsert-org-chat-settings.command';
import { OrgChatSettings } from 'src/domain/chat-settings/domain/org-chat-settings.entity';
import { OrgChatSettingsRepository } from 'src/domain/chat-settings/application/ports/org-chat-settings.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnexpectedChatSettingsError } from 'src/domain/chat-settings/application/chat-settings.errors';
import { getRequiredOrgId } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';

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
    const orgId = getRequiredOrgId(this.contextService);
    this.logger.log({ orgId }, 'Upserting org chat settings');
    return this.orgChatSettingsRepository.upsert(orgId, command.settings);
  }
}
