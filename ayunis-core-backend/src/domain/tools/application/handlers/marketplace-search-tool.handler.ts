import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import type {
  IntegrationListResponseDto,
  SkillListResponseDto,
} from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { appConfig } from 'src/config/app.config';
import { marketplaceConfig } from 'src/config/marketplace.config';
import { MarketplaceUnavailableError } from 'src/domain/marketplace/application/marketplace.errors';
import { ListMarketplaceIntegrationsUseCase } from 'src/domain/marketplace/application/use-cases/list-marketplace-integrations/list-marketplace-integrations.use-case';
import { ListMarketplaceSkillCategoriesUseCase } from 'src/domain/marketplace/application/use-cases/list-marketplace-skill-categories/list-marketplace-skill-categories.use-case';
import { ListMarketplaceSkillsUseCase } from 'src/domain/marketplace/application/use-cases/list-marketplace-skills/list-marketplace-skills.use-case';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { MarketplaceSearchTool } from 'src/domain/tools/domain/tools/marketplace-search-tool.entity';

const UNREACHABLE_MESSAGE =
  'The marketplace cannot be reached right now. Tell the user plainly and suggest trying again later.';
const FAILED_MESSAGE =
  'The marketplace catalogue could not be loaded. Tell the user plainly and suggest trying again later.';

// What the model sees per catalogue entry. The generated DTOs carry landing
// page copy, SEO text and provider details that would only inflate the tool
// result, so the handler projects them down to what a recommendation needs.
interface CatalogueEntryForModel {
  type: 'skill' | 'integration';
  identifier: string;
  name: string;
  shortDescription: string;
  category: string | null;
  featured: boolean;
  installUrl: string;
}

@Injectable()
export class MarketplaceSearchToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(MarketplaceSearchToolHandler.name);

  constructor(
    private readonly listMarketplaceSkillsUseCase: ListMarketplaceSkillsUseCase,
    private readonly listMarketplaceIntegrationsUseCase: ListMarketplaceIntegrationsUseCase,
    private readonly listMarketplaceSkillCategoriesUseCase: ListMarketplaceSkillCategoriesUseCase,
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
      const [skills, integrations] = await Promise.all([
        type === 'integration' ? [] : this.listSkillEntries(installBaseUrl),
        type === 'skill' ? [] : this.listIntegrationEntries(installBaseUrl),
      ]);
      // Grouped by type on purpose: the model presents skills and integrations
      // as different things (self-install vs. admin setup), so a merged
      // ranking would only interleave them.
      return JSON.stringify({
        marketplaceUrl: this.marketplace.serviceUrl ?? null,
        entries: [...skills, ...integrations],
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
    category: skill.skillCategoryId
      ? (categoryNames.get(skill.skillCategoryId) ?? null)
      : null,
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

function installUrl(
  type: CatalogueEntryForModel['type'],
  identifier: string,
  installBaseUrl: string,
): string {
  return `${installBaseUrl}?${type}=${encodeURIComponent(identifier)}`;
}
