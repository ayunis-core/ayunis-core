import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DiscoverMcpCapabilitiesQuery } from './discover-mcp-capabilities.query';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import {
  McpTool as McpToolDto,
  McpResource as McpResourceDto,
  McpPrompt as McpPromptDto,
  McpRequestOptions,
} from 'src/domain/mcp/application/ports/mcp-client.port';
import { McpClientService } from 'src/domain/mcp/application/services/mcp-client.service';
import {
  DiscoveredCapabilities,
  McpCapabilityCacheService,
} from 'src/domain/mcp/application/services/mcp-capability-cache.service';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpIntegrationDisabledError,
  UnexpectedMcpError,
} from 'src/domain/mcp/application/mcp.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { McpTool } from 'src/domain/mcp/domain/mcp-tool.entity';
import {
  McpResource,
  ResourceArgument,
} from 'src/domain/mcp/domain/mcp-resource.entity';
import {
  McpPrompt,
  PromptArgument,
} from 'src/domain/mcp/domain/mcp-prompt.entity';
import { UUID } from 'crypto';

/**
 * Result interface containing discovered capabilities
 */
const CAPABILITY_DISCOVERY_OPTIONS: McpRequestOptions = { timeout: 10000 };

export interface CapabilitiesResult {
  tools: McpTool[];
  resources: McpResource[];
  prompts: McpPrompt[];
  returnsPii: boolean;
}

/**
 * Use case for discovering capabilities from an MCP server.
 * Connects to the MCP server and retrieves available tools, resources, and
 * prompts. Results are served from a short-lived cache so message sends do
 * not re-query every MCP server; access and enabled checks always run fresh.
 */
@Injectable()
export class DiscoverMcpCapabilitiesUseCase {
  constructor(
    @InjectPinoLogger(DiscoverMcpCapabilitiesUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly mcpClientService: McpClientService,
    private readonly contextService: ContextService,
    private readonly capabilityCache: McpCapabilityCacheService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedMcpError)
  async execute(
    query: DiscoverMcpCapabilitiesQuery,
  ): Promise<CapabilitiesResult> {
    this.logger.info({ id: query.integrationId }, 'discoverMcpCapabilities');

    const integration = await this.getAuthorizedIntegration(
      query.integrationId,
    );
    const userId = this.contextService.get('userId');

    const capabilities = await this.capabilityCache.getOrLoad(
      query.integrationId,
      userId,
      () => this.fetchCapabilities(query.integrationId, userId),
    );

    return this.buildResult(integration, capabilities);
  }

  private async getAuthorizedIntegration(
    integrationId: UUID,
  ): Promise<McpIntegration> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const integration = await this.repository.findById(integrationId);
    if (!integration) {
      throw new McpIntegrationNotFoundError(integrationId);
    }

    if (integration.orgId !== orgId) {
      throw new McpIntegrationAccessDeniedError(
        integrationId,
        integration.name,
      );
    }

    if (!integration.enabled) {
      throw new McpIntegrationDisabledError(integrationId, integration.name);
    }

    return integration;
  }

  private async fetchCapabilities(
    integrationId: UUID,
    userId: UUID | undefined,
  ): Promise<DiscoveredCapabilities> {
    // Re-read the integration inside the cache's miss path: an update that
    // commits and invalidates between the access-check read and the cache
    // insert would otherwise leave a discovery built from the pre-update
    // snapshot in the cache until the TTL expires.
    const integration = await this.repository.findById(integrationId);
    if (!integration) {
      throw new McpIntegrationNotFoundError(integrationId);
    }

    const [tools, resources, resourceTemplates, prompts] = await Promise.all([
      this.mcpClientService.listTools(
        integration,
        userId,
        CAPABILITY_DISCOVERY_OPTIONS,
      ),
      this.mcpClientService.listResources(
        integration,
        userId,
        CAPABILITY_DISCOVERY_OPTIONS,
      ),
      this.mcpClientService.listResourceTemplates(
        integration,
        userId,
        CAPABILITY_DISCOVERY_OPTIONS,
      ),
      this.mcpClientService.listPrompts(
        integration,
        userId,
        CAPABILITY_DISCOVERY_OPTIONS,
      ),
    ]);

    return { tools, resources, resourceTemplates, prompts };
  }

  private buildResult(
    integration: McpIntegration,
    capabilities: DiscoveredCapabilities,
  ): CapabilitiesResult {
    const integrationId = integration.id;

    const mcpTools = capabilities.tools.map((tool) =>
      this.mapToMcpTool(tool, integrationId),
    );
    const mcpResources = capabilities.resources.map((resource) =>
      this.mapToMcpResource(resource, integrationId),
    );
    const mcpResourceTemplates = capabilities.resourceTemplates.map(
      (resourceTemplate) =>
        this.mapToMcpResource(resourceTemplate, integrationId),
    );
    const mcpPrompts = capabilities.prompts.map((prompt) =>
      this.mapToMcpPrompt(prompt, integrationId),
    );

    this.logger.info(
      {
        id: integrationId,
        name: integration.name,
        toolCount: mcpTools.length,
        resources: mcpResources.length + mcpResourceTemplates.length,
        prompts: mcpPrompts.length,
      },
      'discoverMcpCapabilitiesSucceeded',
    );

    return {
      tools: mcpTools,
      resources: mcpResources.concat(mcpResourceTemplates),
      prompts: mcpPrompts,
      returnsPii: integration.returnsPii,
    };
  }

  /**
   * Maps MCP SDK tool to domain entity
   */
  private mapToMcpTool(sdkTool: McpToolDto, integrationId: UUID): McpTool {
    return new McpTool(
      sdkTool.name,
      sdkTool.description,
      sdkTool.inputSchema,
      integrationId,
    );
  }

  /**
   * Maps MCP SDK resource to domain entity
   */
  private mapToMcpResource(
    sdkResource: McpResourceDto,
    integrationId: UUID,
  ): McpResource {
    // Map arguments if present (resources can have parameters)
    const args: ResourceArgument[] | undefined = undefined;

    return new McpResource({
      uri: sdkResource.uri,
      name: sdkResource.name,
      description: sdkResource.description,
      mimeType: sdkResource.mimeType,
      integrationId: integrationId,
      arguments: args,
    });
  }

  /**
   * Maps MCP SDK prompt to domain entity
   */
  private mapToMcpPrompt(
    sdkPrompt: McpPromptDto,
    integrationId: UUID,
  ): McpPrompt {
    // Map arguments with required flag
    const args: PromptArgument[] = (sdkPrompt.arguments ?? []).map((arg) => ({
      name: arg.name,
      required: arg.required ?? false,
    }));

    return new McpPrompt(
      sdkPrompt.name,
      sdkPrompt.description,
      args,
      integrationId,
    );
  }
}
