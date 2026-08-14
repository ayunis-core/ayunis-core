import { Injectable, Optional } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UUID } from 'crypto';
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
import { McpIntegrationUserConfigRepositoryPort } from '../ports/mcp-integration-user-config.repository.port';
import { McpIntegration } from '../../domain/mcp-integration.entity';
import { SchemaConfiguredMcpIntegration } from '../../domain/integrations/schema-configured-mcp-integration.entity';
import {
  ConfigField,
  isSystemFixedField,
} from '../../domain/value-objects/integration-config-schema';
import { BearerMcpIntegrationAuth } from '../../domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from '../../domain/auth/custom-header-mcp-integration-auth.entity';
import { OAuthMcpIntegrationAuth } from '../../domain/auth/oauth-mcp-integration-auth.entity';
import {
  McpAuthenticationError,
  McpUserAuthorizationRequiredError,
} from '../mcp.errors';
import { McpOAuthUserTokenRepositoryPort } from '../ports/mcp-oauth-user-token.repository.port';
import { McpCapabilityCacheService } from './mcp-capability-cache.service';
import { handleMcpOperationError } from './mcp-operation-error';

@Injectable()
export class McpClientService {
  constructor(
    @InjectPinoLogger(McpClientService.name)
    private readonly logger: PinoLogger,
    private readonly mcpClient: McpClientPort,
    private readonly credentialEncryption: McpCredentialEncryptionPort,
    private readonly userConfigRepository: McpIntegrationUserConfigRepositoryPort,
    @Optional()
    private readonly oauthTokens?: McpOAuthUserTokenRepositoryPort,
    @Optional()
    private readonly capabilityCache?: McpCapabilityCacheService,
  ) {}

  invalidateConnections(
    integration: McpIntegration,
    userId?: UUID,
  ): Promise<void> {
    return this.mcpClient.invalidateConnections(
      this.buildConnectionScope(integration, userId),
    );
  }

  async buildConnectionConfig(
    integration: McpIntegration,
    userId?: UUID,
  ): Promise<McpConnectionConfig> {
    if (integration instanceof SchemaConfiguredMcpIntegration) {
      return this.buildSchemaConfiguredConnectionConfig(integration, userId);
    }
    return this.buildAuthConnectionConfig(integration, userId);
  }

  private async buildSchemaConfiguredConnectionConfig(
    integration: SchemaConfiguredMcpIntegration,
    userId?: UUID,
  ): Promise<McpConnectionConfig> {
    const userConfigValues = await this.loadUserConfigValues(
      integration,
      userId,
    );
    await this.assertUserAuthorized(integration, userId, userConfigValues);

    try {
      return await this.buildSchemaConfiguredHeaders(
        integration,
        userId,
        userConfigValues,
      );
    } catch (error) {
      if (error instanceof McpAuthenticationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
          integrationId: integration.id,
        },
        'Failed to build schema-configured connection config',
      );
      throw new McpAuthenticationError('Authentication configuration failed');
    }
  }

  private async loadUserConfigValues(
    integration: SchemaConfiguredMcpIntegration,
    userId?: UUID,
  ): Promise<Record<string, string> | null> {
    if (!userId || integration.configSchema.userFields.length === 0) {
      return null;
    }
    const config = await this.userConfigRepository.findByIntegrationAndUser(
      integration.id,
      userId,
    );
    return config?.configValues ?? null;
  }

  private async assertUserAuthorized(
    integration: SchemaConfiguredMcpIntegration,
    userId: UUID | undefined,
    userConfigValues: Record<string, string> | null,
  ): Promise<void> {
    if (!userId) return;
    const fieldsAuthorized = integration.isUserAuthorized(userConfigValues);
    if (!fieldsAuthorized) this.rejectUserAuthorization(integration);
    if (!integration.configSchema.oauth) return;
    if (!this.oauthTokens) this.rejectUserAuthorization(integration);
    const token = await this.oauthTokens.findByIntegrationAndUser(
      integration.id,
      userId,
    );
    if (!token || (token.isExpired() && !token.encryptedRefreshToken)) {
      this.rejectUserAuthorization(integration);
    }
  }

  private async buildSchemaConfiguredHeaders(
    integration: SchemaConfiguredMcpIntegration,
    userId: UUID | undefined,
    userConfigValues: Record<string, string> | null,
  ): Promise<McpConnectionConfig> {
    const headers: Record<string, string> = {};
    await this.applyConfigFieldHeaders(
      headers,
      integration.configSchema.orgFields,
      integration.orgConfigValues,
    );
    if (userId) {
      await this.applyConfigFieldHeaders(
        headers,
        integration.configSchema.userFields,
        userConfigValues ?? {},
      );
    }
    return {
      serverUrl: integration.serverUrl,
      headers,
      connectionScope: this.buildConnectionScope(integration, userId),
      oauth:
        integration.configSchema.oauth && userId
          ? {
              integrationId: integration.id,
              userId,
              orgId: integration.orgId,
            }
          : undefined,
    };
  }

  private rejectUserAuthorization(
    integration: SchemaConfiguredMcpIntegration,
  ): never {
    throw new McpUserAuthorizationRequiredError(
      integration.id,
      integration.name,
    );
  }

  /**
   * Applies config field values as HTTP headers.
   * Only fields with a `headerName` are sent. Prefix is prepended if present.
   * Secret fields are decrypted before sending.
   */
  private async applyConfigFieldHeaders(
    headers: Record<string, string>,
    fields: ConfigField[],
    values: Record<string, string>,
  ): Promise<void> {
    for (const field of fields) {
      if (!field.headerName) continue;

      // System-fixed values from the schema are plaintext and are never stored
      // encrypted, so they are applied directly. Otherwise fall back to the
      // stored value, decrypting secrets.
      let resolvedValue: string;
      if (isSystemFixedField(field)) {
        resolvedValue = field.value as string;
      } else {
        const rawValue = values[field.key];
        if (!rawValue) continue;

        resolvedValue =
          field.type === 'secret'
            ? await this.credentialEncryption.decrypt(rawValue)
            : rawValue;
      }

      const headerValue = field.prefix
        ? `${field.prefix}${resolvedValue}`
        : resolvedValue;

      headers[field.headerName] = headerValue;
    }
  }

  private async buildAuthConnectionConfig(
    integration: McpIntegration,
    userId?: UUID,
  ): Promise<McpConnectionConfig> {
    try {
      const headers = await this.buildAuthHeaders(integration);
      return {
        serverUrl: integration.serverUrl,
        headers,
        connectionScope: this.buildConnectionScope(integration, userId),
      };
    } catch (error) {
      if (error instanceof McpAuthenticationError) {
        throw error;
      }

      this.logger.error(
        {
          err: error as Error,
          integrationId: integration.id,
        },
        'Failed to build connection config',
      );
      throw new McpAuthenticationError('Authentication configuration failed');
    }
  }

  private buildConnectionScope(
    integration: McpIntegration,
    userId?: UUID,
  ): McpConnectionConfig['connectionScope'] {
    return {
      orgId: integration.orgId,
      integrationId: integration.id,
      ...(userId ? { userId } : {}),
    };
  }

  private async buildAuthHeaders(
    integration: McpIntegration,
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    const auth = integration.auth;

    if (auth instanceof BearerMcpIntegrationAuth) {
      if (!auth.authToken) {
        throw new McpAuthenticationError('Bearer token not configured');
      }

      const decryptedToken = await this.credentialEncryption.decrypt(
        auth.authToken,
      );
      const headerName = auth.getAuthHeaderName();

      headers[headerName] =
        headerName === 'Authorization'
          ? `Bearer ${decryptedToken}`
          : decryptedToken;

      this.logger.info(
        {
          integrationId: integration.id,
        },
        'Built connection config for bearer authentication',
      );
    } else if (auth instanceof CustomHeaderMcpIntegrationAuth) {
      if (!auth.secret) {
        throw new McpAuthenticationError('Header secret not configured');
      }

      const decryptedKey = await this.credentialEncryption.decrypt(auth.secret);

      headers[auth.getAuthHeaderName()] = decryptedKey;
    } else if (auth instanceof OAuthMcpIntegrationAuth) {
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

      headers['Authorization'] = `Bearer ${decryptedToken}`;
    }

    return headers;
  }

  async listTools(
    integration: McpIntegration,
    userId?: UUID,
  ): Promise<McpTool[]> {
    const config = await this.buildConnectionConfig(integration, userId);

    try {
      return await this.mcpClient.listTools(config);
    } catch (error) {
      if (this.isMethodNotFoundError(error)) return [];
      await this.handleOperationError(error, integration, 'listTools', userId);
      throw error;
    }
  }

  async listResources(
    integration: McpIntegration,
    userId?: UUID,
  ): Promise<McpResource[]> {
    const config = await this.buildConnectionConfig(integration, userId);

    try {
      return await this.mcpClient.listResources(config);
    } catch (error) {
      if (this.isMethodNotFoundError(error)) return [];
      await this.handleOperationError(
        error,
        integration,
        'listResources',
        userId,
      );
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
    userId?: UUID,
  ): Promise<McpResource[]> {
    const config = await this.buildConnectionConfig(integration, userId);

    try {
      return await this.mcpClient.listResourceTemplates(config);
    } catch (error) {
      if (this.isMethodNotFoundError(error)) return [];
      await this.handleOperationError(
        error,
        integration,
        'listResourceTemplates',
        userId,
      );
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
  async listPrompts(
    integration: McpIntegration,
    userId?: UUID,
  ): Promise<McpPrompt[]> {
    const config = await this.buildConnectionConfig(integration, userId);

    try {
      return await this.mcpClient.listPrompts(config);
    } catch (error) {
      if (this.isMethodNotFoundError(error)) return [];
      await this.handleOperationError(
        error,
        integration,
        'listPrompts',
        userId,
      );
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
    userId?: UUID,
  ): Promise<McpToolResult> {
    const config = await this.buildConnectionConfig(integration, userId);

    try {
      return await this.mcpClient.callTool(config, call);
    } catch (error) {
      await this.handleOperationError(error, integration, 'callTool', userId);
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
    userId?: UUID,
  ): Promise<{ content: unknown; mimeType: string }> {
    const config = await this.buildConnectionConfig(integration, userId);

    try {
      return await this.mcpClient.readResource(config, uri, parameters);
    } catch (error) {
      await this.handleOperationError(
        error,
        integration,
        'readResource',
        userId,
      );
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
    userId?: UUID,
  ): Promise<{ messages: unknown[] }> {
    const config = await this.buildConnectionConfig(integration, userId);

    try {
      return await this.mcpClient.getPrompt(config, name, args);
    } catch (error) {
      await this.handleOperationError(error, integration, 'getPrompt', userId);
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

  private async handleOperationError(
    error: unknown,
    integration: McpIntegration,
    operation: string,
    userId?: UUID,
  ): Promise<never> {
    return handleMcpOperationError({
      error,
      integration,
      operation,
      userId,
      oauthTokens: this.oauthTokens,
      capabilityCache: this.capabilityCache,
      logger: this.logger,
    });
  }
}
