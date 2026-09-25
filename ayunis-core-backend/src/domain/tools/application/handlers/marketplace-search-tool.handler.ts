import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService, ConfigType } from '@nestjs/config';
import { marketplaceConfig } from 'src/config/marketplace.config';
import { MarketplaceUnavailableError } from 'src/domain/marketplace/application/marketplace.errors';
import type { MarketplaceCatalogueEntry } from 'src/domain/marketplace/application/models/marketplace-catalogue-entry';
import { ListMarketplaceCatalogueQuery } from 'src/domain/marketplace/application/use-cases/list-marketplace-catalogue/list-marketplace-catalogue.query';
import { ListMarketplaceCatalogueUseCase } from 'src/domain/marketplace/application/use-cases/list-marketplace-catalogue/list-marketplace-catalogue.use-case';
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

@Injectable()
export class MarketplaceSearchToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(MarketplaceSearchToolHandler.name);

  constructor(
    private readonly listMarketplaceCatalogueUseCase: ListMarketplaceCatalogueUseCase,
    @Inject(marketplaceConfig.KEY)
    private readonly marketplace: ConfigType<typeof marketplaceConfig>,
    private readonly configService: ConfigService,
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
      const entries = await this.listMarketplaceCatalogueUseCase.execute(
        new ListMarketplaceCatalogueQuery({
          type: type === 'all' ? undefined : type,
        }),
      );
      return JSON.stringify({
        marketplaceUrl: this.marketplace.serviceUrl ?? null,
        entries: entries.map((entry) => this.withInstallUrl(entry)),
      });
    } catch (error) {
      throw this.toToolError(tool.name, error);
    }
  }

  private withInstallUrl(entry: MarketplaceCatalogueEntry) {
    const frontendBaseUrl = this.configService.getOrThrow<string>(
      'app.frontend.baseUrl',
    );
    const identifier = encodeURIComponent(entry.identifier);
    return {
      ...entry,
      installUrl: `${frontendBaseUrl}/install?${entry.type}=${identifier}`,
    };
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
    this.logger.error({ err: error, toolName }, 'execute');
    return new ToolExecutionFailedError({
      toolName,
      exposeToLLM: true,
      message: FAILED_MESSAGE,
    });
  }
}
