import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ExecuteMcpToolCommand } from './execute-mcp-tool.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import {
  McpClientPort,
  McpConnectionConfig,
  McpToolCall,
} from '../../ports/mcp-client.port';
import { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
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

/**
 * Result of tool execution
 */
export interface ToolExecutionResult {
  isError: boolean;
  content: any; // Tool response content (structure depends on tool)
  errorMessage?: string; // Error message if execution failed
}

@Injectable()
export class ExecuteMcpToolUseCase {
  private readonly logger = new Logger(ExecuteMcpToolUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly mcpClient: McpClientPort,
    private readonly credentialEncryption: McpCredentialEncryptionPort,
    private readonly registryService: PredefinedMcpIntegrationRegistryService,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: ExecuteMcpToolCommand): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    this.logger.log(
      `[MCP] operation=execute_tool integration=${command.integrationId} tool="${command.toolName}" status=started`,
    );

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const integration = await this.repository.findById(command.integrationId);
      if (!integration) {
        throw new McpIntegrationNotFoundError(command.integrationId);
      }

      if (integration.organizationId !== orgId) {
        throw new McpIntegrationAccessDeniedError(
          command.integrationId,
          integration.name,
        );
      }

      if (!integration.enabled) {
        throw new McpIntegrationDisabledError(
          command.integrationId,
          integration.name,
        );
      }

      // Build connection config
      const connectionConfig = await this.buildConnectionConfig(integration);

      // Execute tool (errors are caught and returned, not thrown)
      try {
        const toolCall: McpToolCall = {
          toolName: command.toolName,
          parameters: command.parameters,
        };

        const result = await this.mcpClient.callTool(
          connectionConfig,
          toolCall,
        );

        const duration = Date.now() - startTime;
        this.logger.log(
          `[MCP] operation=execute_tool integration=${command.integrationId} name="${integration.name}" tool="${command.toolName}" status=${result.isError ? 'tool_error' : 'success'} duration=${duration}ms`,
        );

        return {
          isError: result.isError,
          content: result.content,
          ...(result.isError && { errorMessage: 'Tool execution failed' }),
        };
      } catch (toolError) {
        const duration = Date.now() - startTime;
        const errorMsg =
          (toolError as Error).message || 'Tool execution failed';

        this.logger.warn(
          `[MCP] operation=execute_tool integration=${command.integrationId} name="${integration.name}" tool="${command.toolName}" status=error error="${errorMsg}" duration=${duration}ms`,
        );

        // Return error to LLM (don't throw)
        return {
          isError: true,
          content: null,
          errorMessage: errorMsg,
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        this.logger.warn(
          `[MCP] operation=execute_tool integration=${command.integrationId} tool="${command.toolName}" status=error error="${error.message}" duration=${duration}ms`,
        );
        throw error;
      }

      this.logger.error(
        `[MCP] operation=execute_tool integration=${command.integrationId} tool="${command.toolName}" status=unexpected_error error="${(error as Error).message}" duration=${duration}ms`,
        { error: error as Error },
      );
      throw new UnexpectedMcpError(
        'Unexpected error occurred during tool execution',
      );
    }
  }

  /**
   * Builds MCP connection config from integration entity
   */
  private async buildConnectionConfig(
    integration: McpIntegration,
  ): Promise<McpConnectionConfig> {
    let serverUrl: string;

    // Get server URL based on integration type
    if (integration.type === 'predefined') {
      const predefinedIntegration = integration as PredefinedMcpIntegration;
      const config = this.registryService.getConfig(predefinedIntegration.slug);
      serverUrl = config.url;
    } else {
      const customIntegration = integration as CustomMcpIntegration;
      serverUrl = customIntegration.serverUrl;
    }

    const connectionConfig: McpConnectionConfig = {
      serverUrl,
    };

    // Add authentication if configured
    if (
      integration.authMethod &&
      integration.authHeaderName &&
      integration.encryptedCredentials
    ) {
      const decryptedToken = await this.credentialEncryption.decrypt(
        integration.encryptedCredentials,
      );

      connectionConfig.authHeaderName = integration.authHeaderName;
      connectionConfig.authToken = decryptedToken;
    }

    return connectionConfig;
  }
}
