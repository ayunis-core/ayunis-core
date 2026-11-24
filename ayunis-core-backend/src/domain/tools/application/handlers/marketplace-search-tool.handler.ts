import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService, ConfigType } from '@nestjs/config';
import type {
  IntegrationListResponseDto,
  RoutineInternetAccess,
  RoutineListItemResponseDto,
  RoutineScheduleResponseDto,
  SkillListResponseDto,
} from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { getUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { appConfig } from 'src/config/app.config';
import { FeatureFlag } from 'src/config/features.config';
import { marketplaceConfig } from 'src/config/marketplace.config';
import { MarketplaceUnavailableError } from 'src/domain/marketplace/application/marketplace.errors';
import { ListMarketplaceIntegrationsUseCase } from 'src/domain/marketplace/application/use-cases/list-marketplace-integrations/list-marketplace-integrations.use-case';
import { ListMarketplaceRoutineCategoriesUseCase } from 'src/domain/marketplace/application/use-cases/list-marketplace-routine-categories/list-marketplace-routine-categories.use-case';
import { ListMarketplaceRoutinesUseCase } from 'src/domain/marketplace/application/use-cases/list-marketplace-routines/list-marketplace-routines.use-case';
import { ListMarketplaceSkillCategoriesUseCase } from 'src/domain/marketplace/application/use-cases/list-marketplace-skill-categories/list-marketplace-skill-categories.use-case';
import { ListMarketplaceSkillsUseCase } from 'src/domain/marketplace/application/use-cases/list-marketplace-skills/list-marketplace-skills.use-case';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { MarketplaceSearchTool } from 'src/domain/tools/domain/tools/marketplace-search-tool.entity';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

const UNREACHABLE_MESSAGE =
  'The marketplace cannot be reached right now. Tell the user plainly and suggest trying again later.';
const FAILED_MESSAGE =
  'The marketplace catalogue could not be loaded. Tell the user plainly and suggest trying again later.';

// The same permissions the routines install endpoint requires.
const ROUTINE_INSTALL_PERMISSIONS = [
  Permission.MANAGE_ROUTINES,
  Permission.INSTALL_MARKETPLACE_ROUTINES,
] as const;

type CatalogueType = 'skill' | 'integration' | 'routine';

// What the model sees per catalogue entry. The generated DTOs carry landing
// page copy, SEO text and provider details that would only inflate the tool
// result, so the handler projects them down to what a recommendation needs.
interface CatalogueEntryForModel {
  type: CatalogueType;
  identifier: string;
  name: string;
  shortDescription: string;
  category: string | null;
  featured: boolean;
  installUrl: string;
}

interface RoutineEntryForModel extends CatalogueEntryForModel {
  schedule: RoutineScheduleResponseDto;
  internetAccess: RoutineInternetAccess;
  marketplaceUrl: string | null;
}

@Injectable()
export class MarketplaceSearchToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(MarketplaceSearchToolHandler.name);

  constructor(
    private readonly listMarketplaceSkillsUseCase: ListMarketplaceSkillsUseCase,
    private readonly listMarketplaceIntegrationsUseCase: ListMarketplaceIntegrationsUseCase,
    private readonly listMarketplaceSkillCategoriesUseCase: ListMarketplaceSkillCategoriesUseCase,
    private readonly listMarketplaceRoutinesUseCase: ListMarketplaceRoutinesUseCase,
    private readonly listMarketplaceRoutineCategoriesUseCase: ListMarketplaceRoutineCategoriesUseCase,
    private readonly hasPermissionUseCase: HasPermissionUseCase,
    private readonly contextService: ContextService,
    private readonly configService: ConfigService,
    @Inject(marketplaceConfig.KEY)
    private readonly marketplace: ConfigType<typeof marketplaceConfig>,
    @Inject(appConfig.KEY)
    private readonly app: ConfigType<typeof appConfig>,
  ) {
    super();
  }

  async execute(params: {
    tool: MarketplaceSearchTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    this.logger.log({ name: tool.name, input }, 'execute');
    const { type } = this.validateInput(tool, input);

    try {
      const installBaseUrl = `${this.app.frontend.baseUrl}/install`;
      const wants = (entryType: CatalogueType) =>
        type === undefined || type === 'all' || type === entryType;
      const [skills, integrations, routines] = await Promise.all([
        wants('skill') ? this.listSkillEntries(installBaseUrl) : [],
        wants('integration') ? this.listIntegrationEntries(installBaseUrl) : [],
        wants('routine')
          ? this.listRoutineEntries(installBaseUrl, type === 'routine')
          : [],
      ]);
      // Grouped by type on purpose: the model presents skills, integrations
      // and routines as different things (self-install vs. admin setup vs.
      // scheduled runs), so a merged ranking would only interleave them.
      return JSON.stringify({
        marketplaceUrl: this.marketplace.serviceUrl ?? null,
        entries: [...skills, ...integrations, ...routines],
      });
    } catch (error) {
      throw this.toToolError(tool.name, error);
    }
  }

  private async listSkillEntries(
    installBaseUrl: string,
  ): Promise<CatalogueEntryForModel[]> {
    const [skills, categories] = await Promise.all([
      this.listMarketplaceSkillsUseCase.execute(),
      this.listMarketplaceSkillCategoriesUseCase.execute(),
    ]);
    const categoryNames = new Map(
      categories.map((category) => [category.id, category.name]),
    );
    return skills.map((skill) =>
      toSkillEntry(skill, categoryNames, installBaseUrl),
    );
  }

  private async listIntegrationEntries(
    installBaseUrl: string,
  ): Promise<CatalogueEntryForModel[]> {
    const integrations =
      await this.listMarketplaceIntegrationsUseCase.execute();
    return integrations.map((integration) =>
      toIntegrationEntry(integration, installBaseUrl),
    );
  }

  // Routine entries carry install links, so they are listed only for users
  // who could follow them: with routines enabled and the permissions the
  // install endpoint checks. Everyone else gets none, whatever the type.
  private async listRoutineEntries(
    installBaseUrl: string,
    onlyRoutines: boolean,
  ): Promise<RoutineEntryForModel[]> {
    if (!(await this.mayInstallRoutines())) return [];
    try {
      return await this.fetchRoutineEntries(installBaseUrl);
    } catch (error) {
      // A marketplace that predates routines answers their endpoints with
      // its website, so their failure must not also hide skills and
      // integrations from a search over everything.
      if (onlyRoutines) throw error;
      this.logger.warn(
        { err: error as Error },
        'Marketplace routines could not be listed; listing the rest',
      );
      return [];
    }
  }

  private async fetchRoutineEntries(
    installBaseUrl: string,
  ): Promise<RoutineEntryForModel[]> {
    const [routines, categories] = await Promise.all([
      this.listMarketplaceRoutinesUseCase.execute(),
      this.listMarketplaceRoutineCategoriesUseCase.execute(),
    ]);
    const categoryNames = new Map(
      categories.map((category) => [category.id, category.name]),
    );
    return routines.map((routine) =>
      toRoutineEntry(routine, categoryNames, {
        installBaseUrl,
        marketplaceUrl: this.marketplace.serviceUrl,
      }),
    );
  }

  private async mayInstallRoutines(): Promise<boolean> {
    if (!this.configService.get<boolean>(`features.${FeatureFlag.Routines}`)) {
      return false;
    }
    const user = getUserContext(this.contextService);
    if (!user) return false;
    const granted = await Promise.all(
      ROUTINE_INSTALL_PERMISSIONS.map((permission) =>
        this.hasPermissionUseCase.execute(
          new HasPermissionQuery(user.orgId, user.role, permission),
        ),
      ),
    );
    return granted.every(Boolean);
  }

  // A schema violation must reach the model so it can correct the call;
  // ExecuteToolUseCase hides raw errors from it.
  private validateInput(
    tool: MarketplaceSearchTool,
    input: Record<string, unknown>,
  ): ReturnType<MarketplaceSearchTool['validateParams']> {
    try {
      return tool.validateParams(input);
    } catch (error) {
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        exposeToLLM: true,
        message: error instanceof Error ? error.message : 'Invalid input',
      });
    }
  }

  private toToolError(
    toolName: string,
    error: unknown,
  ): ToolExecutionFailedError {
    if (error instanceof MarketplaceUnavailableError) {
      this.logger.warn({ toolName }, 'Marketplace unavailable');
      return new ToolExecutionFailedError({
        toolName,
        exposeToLLM: true,
        message: UNREACHABLE_MESSAGE,
      });
    }
    return new ToolExecutionFailedError({
      toolName,
      exposeToLLM: true,
      message: FAILED_MESSAGE,
    });
  }
}

function toSkillEntry(
  skill: SkillListResponseDto,
  categoryNames: Map<string, string>,
  installBaseUrl: string,
): CatalogueEntryForModel {
  return {
    type: 'skill',
    identifier: skill.identifier,
    name: skill.name,
    shortDescription: skill.shortDescription,
    category: categoryName(skill.skillCategoryId, categoryNames),
    featured: skill.featured,
    installUrl: installUrl('skill', skill.identifier, installBaseUrl),
  };
}

function toIntegrationEntry(
  integration: IntegrationListResponseDto,
  installBaseUrl: string,
): CatalogueEntryForModel {
  return {
    type: 'integration',
    identifier: integration.identifier,
    name: integration.name,
    shortDescription: integration.shortDescription,
    category: null,
    featured: integration.featured,
    installUrl: installUrl(
      'integration',
      integration.identifier,
      installBaseUrl,
    ),
  };
}

function toRoutineEntry(
  routine: RoutineListItemResponseDto,
  categoryNames: Map<string, string>,
  urls: { installBaseUrl: string; marketplaceUrl: string | undefined },
): RoutineEntryForModel {
  return {
    type: 'routine',
    identifier: routine.identifier,
    name: routine.name,
    shortDescription: routine.shortDescription,
    category: categoryName(routine.routineCategoryId, categoryNames),
    featured: routine.featured,
    schedule: routine.schedule,
    internetAccess: routine.internetAccess,
    installUrl: installUrl('routine', routine.identifier, urls.installBaseUrl),
    marketplaceUrl: urls.marketplaceUrl
      ? routineDetailUrl(urls.marketplaceUrl, routine.identifier)
      : null,
  };
}

function categoryName(
  categoryId: string | null,
  categoryNames: Map<string, string>,
): string | null {
  return categoryId ? (categoryNames.get(categoryId) ?? null) : null;
}

// The public marketplace site's routine page, as linked from its listing.
function routineDetailUrl(marketplaceUrl: string, identifier: string): string {
  const base = marketplaceUrl.endsWith('/')
    ? marketplaceUrl
    : `${marketplaceUrl}/`;
  return `${base}routines/${encodeURIComponent(identifier)}`;
}

function installUrl(
  type: CatalogueType,
  identifier: string,
  installBaseUrl: string,
): string {
  return `${installBaseUrl}?${type}=${encodeURIComponent(identifier)}`;
}
