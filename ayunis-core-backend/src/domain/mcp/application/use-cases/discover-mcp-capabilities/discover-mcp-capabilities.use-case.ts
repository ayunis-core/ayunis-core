import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { DiscoverMcpCapabilitiesQuery } from './discover-mcp-capabilities.query';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import {
  McpTool as McpToolDto,
  McpResource as McpResourceDto,
  McpPrompt as McpPromptDto,
} from '../../ports/mcp-client.port';
import { McpClientService } from '../../services/mcp-client.service';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpIntegrationDisabledError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { McpTool } from '../../../domain/mcp-tool.entity';
import {
  McpResource,
  ResourceArgument,
} from '../../../domain/mcp-resource.entity';
import { McpPrompt, PromptArgument } from '../../../domain/mcp-prompt.entity';
import { UUID } from 'crypto';

/**
 * Result interface containing discovered capabilities
 */
export interface CapabilitiesResult {
  tools: McpTool[];
  resources: McpResource[];
  prompts: McpPrompt[];
  returnsPii: boolean;
}

/**
 * Use case for discovering capabilities from an MCP server.
 * Connects to the MCP server and retrieves available tools, resources, and prompts.
 */
@Injectable()
export class DiscoverMcpCapabilitiesUseCase {
  private readonly logger = new Logger(DiscoverMcpCapabilitiesUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly mcpClientService: McpClientService,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    query: DiscoverMcpCapabilitiesQuery,
  ): Promise<CapabilitiesResult> {
    this.logger.log('discoverMcpCapabilities', { id: query.integrationId });

    try {
      // Get current user's organization
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Fetch integration
      const integration = await this.repository.findById(query.integrationId);
      if (!integration) {
        throw new McpIntegrationNotFoundError(query.integrationId);
      }

      // Verify organization access
      if (integration.orgId !== orgId) {
        throw new McpIntegrationAccessDeniedError(
          query.integrationId,
          integration.name,
        );
      }

      // Verify integration is enabled
      if (!integration.enabled) {
        throw new McpIntegrationDisabledError(
          query.integrationId,
          integration.name,
        );
      }

      // Discover capabilities from MCP server
      const userId = this.contextService.get('userId');
      const [tools, resources, resourceTemplates, prompts] = await Promise.all([
        this.mcpClientService.listTools(integration, userId),
        this.mcpClientService.listResources(integration, userId),
        this.mcpClientService.listResourceTemplates(integration, userId),
        this.mcpClientService.listPrompts(integration, userId),
      ]);

      // Map to domain entities
      const mcpTools = tools.map((tool) =>
        this.mapToMcpTool(tool, query.integrationId),
      );
      const mcpResources = resources.map((resource) =>
        this.mapToMcpResource(resource, query.integrationId),
      );
      const mcpResourceTemplates = resourceTemplates.map((resourceTemplate) =>
        this.mapToMcpResource(resourceTemplate, query.integrationId),
      );
      const mcpPrompts = prompts.map((prompt) =>
        this.mapToMcpPrompt(prompt, query.integrationId),
      );

      this.logger.log('discoverMcpCapabilitiesSucceeded', {
        id: query.integrationId,
        name: integration.name,
        tools: mcpTools.length,
        resources: mcpResources.length + mcpResourceTemplates.length,
        prompts: mcpPrompts.length,
      });

      return {
        tools: mcpTools,
        resources: mcpResources.concat(mcpResourceTemplates),
        prompts: mcpPrompts,
        returnsPii: integration.returnsPii,
      };
    } catch (error) {
      // Re-throw expected errors
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        this.logger.warn('discoverMcpCapabilitiesFailed', {
          id: query.integrationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }

      // Wrap unexpected errors
      this.logger.error('discoverMcpCapabilitiesUnexpectedError', {
        id: query.integrationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedMcpError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  /**
   * Maps MCP SDK tool to domain entity
   */
  private mapToMcpTool(sdkTool: McpToolDto, integrationId: UUID): McpTool {
    return new McpTool(
      sdkTool.name,
      sdkTool.description,
      sdkTool.inputSchema as Record<string, unknown>,
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
    const args: PromptArgument[] = (sdkPrompt.arguments || []).map((arg) => ({
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
