import { Injectable, Logger } from '@nestjs/common';
import {
  McpClientPort,
  McpConnectionConfig,
  McpTool,
  McpResource,
  McpPrompt,
  McpToolCall,
  McpToolResult,
} from '../ports/mcp-client.port';
import { McpCredentialEncryptionPort } from '../ports/mcp-credential-encryption.port';
import { McpIntegration } from '../../domain/mcp-integration.entity';
import { BearerMcpIntegrationAuth } from '../../domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from '../../domain/auth/custom-header-mcp-integration-auth.entity';
import { OAuthMcpIntegrationAuth } from '../../domain/auth/oauth-mcp-integration-auth.entity';
import { McpAuthenticationError } from '../mcp.errors';

/**
 * Service for executing MCP operations with authentication.
 * Leverages the polymorphic authentication design of integration entities.
 * Handles credential decryption and connection configuration.
 */
@Injectable()
export class McpClientService {
  private readonly logger = new Logger(McpClientService.name);

  constructor(
    private readonly mcpClient: McpClientPort,
    private readonly credentialEncryption: McpCredentialEncryptionPort,
  ) {}

  /**
   * Builds MCP connection configuration from integration entity.
   * Delegates auth header generation to the integration entity with special
   * handling for decryption of encrypted credentials.
   *
   * @param integration The MCP integration entity
   * @returns Connection configuration for MCP client
   * @throws McpAuthenticationError if authentication configuration fails
   */
  async buildConnectionConfig(
    integration: McpIntegration,
  ): Promise<McpConnectionConfig> {
    const config: McpConnectionConfig = {
      serverUrl: integration.serverUrl,
    };

    try {
      const auth = integration.auth;

      if (auth instanceof BearerMcpIntegrationAuth) {
        if (!auth.authToken) {
          throw new McpAuthenticationError('Bearer token not configured');
        }

        const decryptedToken = await this.credentialEncryption.decrypt(
          auth.authToken,
        );
        const headerName = auth.getAuthHeaderName();

        config.authHeaderName = headerName;
        config.authToken =
          headerName === 'Authorization'
            ? `Bearer ${decryptedToken}`
            : decryptedToken;

        this.logger.log('Built connection config for bearer authentication', {
          integrationId: integration.id,
          config: config,
        });
        return config;
      }

      if (auth instanceof CustomHeaderMcpIntegrationAuth) {
        if (!auth.secret) {
          throw new McpAuthenticationError('Header secret not configured');
        }

        const decryptedKey = await this.credentialEncryption.decrypt(
          auth.secret,
        );

        config.authHeaderName = auth.getAuthHeaderName();
        config.authToken = decryptedKey;

        return config;
      }

      if (auth instanceof OAuthMcpIntegrationAuth) {
        if (!auth.accessToken) {
          throw new McpAuthenticationError('OAuth access token not available');
        }

        if (auth.isTokenExpired()) {
          throw new McpAuthenticationError(
            'OAuth token expired - refresh needed',
          );
        }

        const decryptedToken = await this.credentialEncryption.decrypt(
          auth.accessToken,
        );

        config.authHeaderName = 'Authorization';
        config.authToken = `Bearer ${decryptedToken}`;

        return config;
      }

      // No auth headers needed for anonymous integrations
      return config;
    } catch (error) {
      if (error instanceof McpAuthenticationError) {
        throw error;
      }

      this.logger.error('Failed to build connection config', {
        error: error as Error,
        integrationId: integration.id,
      });
      throw new McpAuthenticationError('Authentication configuration failed');
    }
  }

  /**
   * Validates connection to an MCP server and updates integration status.
   *
   * @param integration The MCP integration entity
   * @returns true if connection is valid, false otherwise
   */
  async validateConnection(integration: McpIntegration): Promise<boolean> {
    try {
      const config = await this.buildConnectionConfig(integration);
      const result = await this.mcpClient.validateConnection(config);

      integration.updateConnectionStatus(
        result.valid ? 'connected' : 'error',
        result.error,
      );

      return result.valid;
    } catch (error) {
      this.logger.error('Failed to validate connection', {
        error: error as Error,
        integrationId: integration.id,
      });

      integration.updateConnectionStatus(
        'error',
        'Authentication configuration failed',
      );

      return false;
    }
  }

  /**
   * Lists all tools available on the MCP server.
   *
   * @param integration The MCP integration entity
   * @returns List of available tools
   * @throws McpAuthenticationError on 401 responses
   */
  async listTools(integration: McpIntegration): Promise<McpTool[]> {
    const config = await this.buildConnectionConfig(integration);

    try {
      return await this.mcpClient.listTools(config);
    } catch (error) {
      if (this.isMethodNotFoundError(error)) return [];
      this.handleOperationError(error, integration, 'listTools');
      throw error;
    }
  }

  /**
   * Lists all resources available on the MCP server.
   *
   * @param integration The MCP integration entity
   * @returns List of available resources
   * @throws McpAuthenticationError on 401 responses
   */
  async listResources(integration: McpIntegration): Promise<McpResource[]> {
    const config = await this.buildConnectionConfig(integration);

    try {
      return await this.mcpClient.listResources(config);
    } catch (error) {
      if (this.isMethodNotFoundError(error)) return [];
      this.handleOperationError(error, integration, 'listResources');
      throw error;
    }
  }

  /**
   * Lists all resource templates available on the MCP server.
   *
   * @param integration The MCP integration entity
   * @returns List of available resource templates
   * @throws McpAuthenticationError on 401 responses
   */
  async listResourceTemplates(
    integration: McpIntegration,
  ): Promise<McpResource[]> {
    const config = await this.buildConnectionConfig(integration);

    try {
      return await this.mcpClient.listResourceTemplates(config);
    } catch (error) {
      if (this.isMethodNotFoundError(error)) return [];
      this.handleOperationError(error, integration, 'listResourceTemplates');
      throw error;
    }
  }

  /**
   * Lists all prompt templates available on the MCP server.
   *
   * @param integration The MCP integration entity
   * @returns List of available prompts
   * @throws McpAuthenticationError on 401 responses
   */
  async listPrompts(integration: McpIntegration): Promise<McpPrompt[]> {
    const config = await this.buildConnectionConfig(integration);

    try {
      return await this.mcpClient.listPrompts(config);
    } catch (error) {
      if (this.isMethodNotFoundError(error)) return [];
      this.handleOperationError(error, integration, 'listPrompts');
      throw error;
    }
  }

  /**
   * Executes a tool on the MCP server.
   *
   * @param integration The MCP integration entity
   * @param call Tool call parameters
   * @returns Tool execution result
   * @throws McpAuthenticationError on 401 responses
   */
  async callTool(
    integration: McpIntegration,
    call: McpToolCall,
  ): Promise<McpToolResult> {
    const config = await this.buildConnectionConfig(integration);

    try {
      return await this.mcpClient.callTool(config, call);
    } catch (error) {
      this.handleOperationError(error, integration, 'callTool');
      throw error;
    }
  }

  /**
   * Reads a resource from the MCP server.
   *
   * @param integration The MCP integration entity
   * @param uri Resource URI
   * @param parameters Optional parameters for parameterized resources
   * @returns Resource content and mime type
   * @throws McpAuthenticationError on 401 responses
   */
  async readResource(
    integration: McpIntegration,
    uri: string,
    parameters?: Record<string, unknown>,
  ): Promise<{ content: unknown; mimeType: string }> {
    const config = await this.buildConnectionConfig(integration);

    try {
      return await this.mcpClient.readResource(config, uri, parameters);
    } catch (error) {
      this.handleOperationError(error, integration, 'readResource');
      throw error;
    }
  }

  /**
   * Gets a prompt template from the MCP server.
   *
   * @param integration The MCP integration entity
   * @param name Prompt template name
   * @param args Arguments to fill the prompt template
   * @returns Prompt messages
   * @throws McpAuthenticationError on 401 responses
   */
  async getPrompt(
    integration: McpIntegration,
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ messages: unknown[] }> {
    const config = await this.buildConnectionConfig(integration);

    try {
      return await this.mcpClient.getPrompt(config, name, args);
    } catch (error) {
      this.handleOperationError(error, integration, 'getPrompt');
      throw error;
    }
  }

  private isMethodNotFoundError(error: unknown): boolean {
    return Boolean(
      error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: number }).code === -32601,
    );
  }

  /**
   * Handles errors from MCP operations, with special handling for 401 responses.
   *
   * @param error The error that occurred
   * @param integration The integration entity (for updating status)
   * @param operation The operation name (for logging)
   */
  private handleOperationError(
    error: unknown,
    integration: McpIntegration,
    operation: string,
  ): void {
    // Check for 401 authentication errors
    if ((error as { status?: number }).status === 401) {
      this.logger.warn(
        `Authentication failed for MCP operation: ${operation}`,
        {
          integrationId: integration.id,
        },
      );

      integration.updateConnectionStatus('error', 'Authentication failed');

      throw new McpAuthenticationError('Invalid authentication credentials');
    }
    this.logger.error('Failed to execute MCP operation', {
      error: error as Error,
      integrationId: integration.id,
      operation: operation,
    });
    throw error;
  }
}
