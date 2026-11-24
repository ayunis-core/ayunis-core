import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetOrgChatSettingsUseCase } from 'src/domain/chat-settings/application/use-cases/get-org-chat-settings/get-org-chat-settings.use-case';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import {
  PromptSlot,
  type CapabilityContribution,
  type RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';
import type { AllowedDomains } from 'src/domain/retrievers/url-retrievers/domain/allowed-domains';

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

  contribute(context: RunCapabilityContext): Promise<CapabilityContribution> {
    return this.contributeWebTools(context);
  }

  /** The web tools, limited to `allowedDomains` when given. */
  async contributeWebTools(
    context: RunCapabilityContext,
    allowedDomains?: AllowedDomains,
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
    const tools = await assembleTools(
      this.assembleToolUseCase,
      types,
      allowedDomains,
    );
    if (!allowedDomains) return { tools };
    return {
      tools,
      sections: [
        {
          slot: PromptSlot.POLICIES,
          content: allowedDomainsPolicy(allowedDomains),
        },
      ],
    };
  }
}

function allowedDomainsPolicy(allowedDomains: AllowedDomains): string {
  return `<allowed_domains>
Web access in this run is limited to these domains and their subdomains: ${allowedDomains.toString()}
${ToolType.WEBSITE_CONTENT} refuses pages on other domains, including redirects to them, and ${ToolType.INTERNET_SEARCH} only returns results from these domains. Look for the information there.
</allowed_domains>`;
}
