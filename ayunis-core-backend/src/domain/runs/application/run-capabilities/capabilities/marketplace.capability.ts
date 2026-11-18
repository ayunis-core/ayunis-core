import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { marketplaceConfig } from 'src/config/marketplace.config';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import type {
  CapabilityContribution,
  RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

// Self-hosted installations without a marketplace, and members whose role may
// not install from it, must never see the tools, so the assistant has nothing
// to mention: search results carry install links and install shows a card.
@Injectable()
export class MarketplaceCapability implements RunCapability {
  constructor(
    @Inject(marketplaceConfig.KEY)
    private readonly marketplace: ConfigType<typeof marketplaceConfig>,
    private readonly assembleToolUseCase: AssembleToolUseCase,
    private readonly contextService: ContextService,
    private readonly hasPermissionUseCase: HasPermissionUseCase,
  ) {}

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    if (!context.model.canUseTools || !this.marketplace.enabled) return {};
    if (!(await this.mayInstall(context))) return {};
    const tools = await assembleTools(this.assembleToolUseCase, [
      ToolType.MARKETPLACE_SEARCH,
      ToolType.INSTALL_MARKETPLACE_SKILL,
    ]);
    return { tools };
  }

  private mayInstall(context: RunCapabilityContext): Promise<boolean> {
    const { role } = getRequiredUserContext(this.contextService);
    return this.hasPermissionUseCase.execute(
      new HasPermissionQuery(
        context.orgId,
        role,
        Permission.INSTALL_MARKETPLACE_SKILLS,
      ),
    );
  }
}
