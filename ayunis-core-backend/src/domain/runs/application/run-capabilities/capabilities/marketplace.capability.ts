import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { marketplaceConfig } from 'src/config/marketplace.config';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import type {
  CapabilityContribution,
  RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

// Self-hosted installations without a marketplace must never see the tools,
// so the assistant has nothing to mention.
@Injectable()
export class MarketplaceCapability implements RunCapability {
  constructor(
    @Inject(marketplaceConfig.KEY)
    private readonly marketplace: ConfigType<typeof marketplaceConfig>,
    private readonly assembleToolUseCase: AssembleToolUseCase,
  ) {}

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    if (!context.model.canUseTools || !this.marketplace.enabled) return {};
    const tools = await assembleTools(this.assembleToolUseCase, [
      ToolType.MARKETPLACE_SEARCH,
      ToolType.INSTALL_MARKETPLACE_SKILL,
    ]);
    return { tools };
  }
}
