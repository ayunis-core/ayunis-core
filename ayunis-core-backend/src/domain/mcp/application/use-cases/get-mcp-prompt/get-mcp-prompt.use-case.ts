import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { GetMcpPromptQuery } from './get-mcp-prompt.query';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import {
  McpClientPort,
  McpConnectionConfig,
} from '../../ports/mcp-client.port';
import { PredefinedMcpIntegrationRegistryService } from '../../services/predefined-mcp-integration-registry.service';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpIntegrationDisabledError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  McpIntegration,
  PredefinedMcpIntegration,
  CustomMcpIntegration,
} from '../../../domain/mcp-integration.entity';

export interface PromptMessage {
  role: string;
  content: string;
}

export interface PromptResult {
  messages: PromptMessage[];
  description?: string;
}

@Injectable()
export class GetMcpPromptUseCase {
  private readonly logger = new Logger(GetMcpPromptUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly mcpClient: McpClientPort,
    private readonly registryService: PredefinedMcpIntegrationRegistryService,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: GetMcpPromptQuery): Promise<PromptResult> {
    this.logger.log('getMcpPrompt', {
      id: query.integrationId,
      prompt: query.promptName,
    });

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const integration = await this.repository.findById(query.integrationId);
      if (!integration) {
        throw new McpIntegrationNotFoundError(query.integrationId);
      }

      if (integration.organizationId !== orgId) {
        throw new McpIntegrationAccessDeniedError(query.integrationId);
      }

      if (!integration.enabled) {
        throw new McpIntegrationDisabledError(query.integrationId);
      }

      // Build connection config
      const connectionConfig = this.buildConnectionConfig(integration);

      // Retrieve prompt from MCP server
      const promptResponse = await this.mcpClient.getPrompt(
        connectionConfig,
        query.promptName,
        query.args || {},
      );

      this.logger.log('promptRetrieved', {
        id: query.integrationId,
        prompt: query.promptName,
        messageCount: promptResponse.messages.length,
      });

      // Map to PromptResult
      return {
        messages: promptResponse.messages.map((msg: any) => ({
          role: msg.role,
          content:
            typeof msg.content === 'string'
              ? msg.content
              : msg.content.text || String(msg.content),
        })),
        description: (promptResponse as any).description,
      };
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error getting prompt', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }

  private buildConnectionConfig(
    integration: McpIntegration,
  ): McpConnectionConfig {
    let serverUrl: string;

    // Determine server URL based on integration type
    if (integration.type === 'predefined') {
      const predefined = integration as PredefinedMcpIntegration;
      const config = this.registryService.getConfig(predefined.slug);
      serverUrl = config.url;
    } else {
      const custom = integration as CustomMcpIntegration;
      serverUrl = custom.serverUrl;
    }

    // Build connection config with optional auth
    const connectionConfig: McpConnectionConfig = {
      serverUrl,
    };

    if (integration.authHeaderName && integration.encryptedCredentials) {
      connectionConfig.authHeaderName = integration.authHeaderName;
      connectionConfig.authToken = integration.encryptedCredentials;
    }

    return connectionConfig;
  }
}
