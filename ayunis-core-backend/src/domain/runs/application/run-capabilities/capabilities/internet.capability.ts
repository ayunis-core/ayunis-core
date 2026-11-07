import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetOrgChatSettingsUseCase } from 'src/domain/chat-settings/application/use-cases/get-org-chat-settings/get-org-chat-settings.use-case';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import type {
  CapabilityContribution,
  RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

/**
 * `website_content` and `internet_search`, offered only while the org allows
 * internet access; web search additionally needs a configured provider.
 */
@Injectable()
export class InternetCapability implements RunCapability {
  private readonly logger = new Logger(InternetCapability.name);

  constructor(
    private readonly getOrgChatSettingsUseCase: GetOrgChatSettingsUseCase,
    private readonly configService: ConfigService,
    private readonly assembleToolUseCase: AssembleToolUseCase,
  ) {}

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    if (!context.model.canUseTools) return {};
    const orgChatSettings = await this.getOrgChatSettingsUseCase.execute();
    if (!orgChatSettings.internetSearchEnabled) {
      this.logger.debug('Internet access disabled for org, skipping web tools');
      return {};
    }
    const types = [ToolType.WEBSITE_CONTENT];
    if (this.configService.get<boolean>('internetSearch.isAvailable')) {
      types.push(ToolType.INTERNET_SEARCH);
    }
    const tools = await assembleTools(this.assembleToolUseCase, types);
    return { tools };
  }
}
