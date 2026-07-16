import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgChatSettings } from '../../../domain/org-chat-settings.entity';
import { OrgChatSettingsRepository } from '../../ports/org-chat-settings.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedChatSettingsError } from '../../chat-settings.errors';

@Injectable()
export class GetOrgChatSettingsUseCase {
  private readonly logger = new Logger(GetOrgChatSettingsUseCase.name);

  constructor(
    private readonly orgChatSettingsRepository: OrgChatSettingsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedChatSettingsError)
  async execute(): Promise<OrgChatSettings> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }
    this.logger.log('execute', { orgId });

    const orgChatSettings =
      await this.orgChatSettingsRepository.findByOrgId(orgId);

    // Fall back to defaults (internet access enabled) when nothing is stored.
    return orgChatSettings ?? new OrgChatSettings({ orgId });
  }
}
