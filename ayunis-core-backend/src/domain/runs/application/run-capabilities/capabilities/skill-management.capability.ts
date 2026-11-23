import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { marketplaceConfig } from 'src/config/marketplace.config';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import type {
  CapabilityContribution,
  RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

/**
 * The create/edit skill widgets and the marketplace tools, since installing
 * from the marketplace creates a skill. Each tool is offered only where its
 * card would succeed: `create_skill` to users who may save a personal skill,
 * so neither the model nor the capabilities reading it offer a card that
 * fails. Self-hosted installations without a marketplace, and members whose
 * role may not install from it, must never see the marketplace tools, so the
 * assistant has nothing to mention: search results carry install links and
 * install shows a card.
 */
@Injectable()
export class SkillManagementCapability implements RunCapability {
  readonly id = 'skill_management';
  readonly description =
    'Create and edit skills, and search and install skills from the marketplace.';

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
    if (!context.model.canUseTools) return {};
    const [skillTools, marketplaceTools] = await Promise.all([
      this.assembleSkillTools(context),
      this.assembleMarketplaceTools(context),
    ]);
    return { tools: [...skillTools, ...marketplaceTools] };
  }

  private async assembleSkillTools(
    context: RunCapabilityContext,
  ): Promise<Tool[]> {
    const [catalog, mayCreate] = await Promise.all([
      context.skillCatalog(),
      this.hasPermission(context, Permission.MANAGE_SKILLS),
    ]);
    const tools = mayCreate
      ? await assembleTools(this.assembleToolUseCase, [ToolType.CREATE_SKILL])
      : [];
    if (catalog.editableSkillIds.size > 0) {
      tools.push(
        ...(await assembleTools(
          this.assembleToolUseCase,
          [ToolType.EDIT_SKILL],
          catalog.editableSkillIds,
        )),
      );
    }
    return tools;
  }

  private async assembleMarketplaceTools(
    context: RunCapabilityContext,
  ): Promise<Tool[]> {
    if (!this.marketplace.enabled) return [];
    const mayInstall = await this.hasPermission(
      context,
      Permission.INSTALL_MARKETPLACE_SKILLS,
    );
    if (!mayInstall) return [];
    return assembleTools(this.assembleToolUseCase, [
      ToolType.MARKETPLACE_SEARCH,
      ToolType.INSTALL_MARKETPLACE_SKILL,
    ]);
  }

  private hasPermission(
    context: RunCapabilityContext,
    permission: Permission,
  ): Promise<boolean> {
    const { role } = getRequiredUserContext(this.contextService);
    return this.hasPermissionUseCase.execute(
      new HasPermissionQuery(context.orgId, role, permission),
    );
  }
}
