import { McpConnectionHealthService } from './mcp-connection-health.service';
import { mcpConnectionRevision } from './mcp-connection-revision';
import type { McpIntegrationUserConfig } from 'src/domain/mcp/domain/mcp-integration-user-config.entity';
import type { McpOAuthUserToken } from 'src/domain/mcp/domain/mcp-oauth-user-token.entity';
import type { DiscoveredCapabilities } from './mcp-capability-cache.service';
import { Injectable, Optional, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import {
  McpClientPort,
  McpConnectionConfig,
  McpTool,
  McpResource,
  McpPrompt,
  McpToolCall,
  McpToolResult,
  McpRequestOptions,
} from 'src/domain/mcp/application/ports/mcp-client.port';
import { McpCredentialEncryptionPort } from 'src/domain/mcp/application/ports/mcp-credential-encryption.port';
import { McpIntegrationUserConfigRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integration-user-config.repository.port';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { SchemaConfiguredMcpIntegration } from 'src/domain/mcp/domain/integrations/schema-configured-mcp-integration.entity';
import {
  ConfigField,
  isSystemFixedField,
} from 'src/domain/mcp/domain/value-objects/integration-config-schema';
import { BearerMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/custom-header-mcp-integration-auth.entity';
import { OAuthMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/oauth-mcp-integration-auth.entity';
import {
  McpAuthenticationError,
  McpUserAuthorizationRequiredError,
} from 'src/domain/mcp/application/mcp.errors';
import { McpOAuthUserTokenRepositoryPort } from 'src/domain/mcp/application/ports/mcp-oauth-user-token.repository.port';
import { McpCapabilityCacheService } from './mcp-capability-cache.service';
import { handleMcpOperationError } from './mcp-operation-error';

@Injectable()
export class McpClientService {
  private readonly logger = new Logger(McpClientService.name);

  constructor(
    private readonly mcpClient: McpClientPort,
    private readonly credentialEncryption: McpCredentialEncryptionPort,
    private readonly userConfigRepository: McpIntegrationUserConfigRepositoryPort,
    @Optional()
    private readonly oauthTokens?: McpOAuthUserTokenRepositoryPort,
    @Optional()
    private readonly capabilityCache?: McpCapabilityCacheService,
    @Optional() private readonly health?: McpConnectionHealthService,
  ) {}

  invalidateConnections(
    integration: McpIntegration,
    userId?: UUID,
  ): Promise<void> {
    return this.mcpClient.invalidateConnections(
      this.buildConnectionScope(integration, userId),
    );
  }

  async verifyUserConfig(
    integration: SchemaConfiguredMcpIntegration,
    userId: UUID,
    encryptedValues: Record<string, string>,
  ): Promise<void> {
    // OAuth authorization owns its exchange; header-form saves must not start one.
    if (integration.configSchema.oauth) return;
    const config = await this.buildSchemaConfiguredHeaders(
      integration,
      userId,
      encryptedValues,
    );
    await this.mcpClient.verifyCredentials(config);
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
    const userConfig = await this.loadUserConfigValues(integration, userId);
    const userConfigValues = userConfig?.configValues ?? null;
    const token = await this.assertUserAuthorized(
      integration,
      userId,
      userConfigValues,
    );

    try {
      const config = await this.buildSchemaConfiguredHeaders(
        integration,
        userId,
        userConfigValues,
      );
      return {
        ...config,
        observationRevision: mcpConnectionRevision(
          integration,
          userConfig,
          token,
        ),
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
        'Failed to build schema-configured connection config',
      );
      throw new McpAuthenticationError('Authentication configuration failed');
    }
  }

  private async loadUserConfigValues(
    integration: SchemaConfiguredMcpIntegration,
    userId?: UUID,
  ): Promise<McpIntegrationUserConfig | null> {
    if (!userId || integration.configSchema.userFields.length === 0) {
      return null;
    }
    const config = await this.userConfigRepository.findByIntegrationAndUser(
      integration.id,
      userId,
    );
    return config;
  }

  private async assertUserAuthorized(
    integration: SchemaConfiguredMcpIntegration,
    userId: UUID | undefined,
    userConfigValues: Record<string, string> | null,
  ): Promise<McpOAuthUserToken | null> {
    if (!userId) return null;
    const fieldsAuthorized = integration.isUserAuthorized(userConfigValues);
    if (!fieldsAuthorized) this.rejectUserAuthorization(integration);
    if (!integration.configSchema.oauth) return null;
    if (!this.oauthTokens) this.rejectUserAuthorization(integration);
    const token = await this.oauthTokens.findByIntegrationAndUser(
      integration.id,
      userId,
    );
    if (!token || (token.isExpired() && !token.encryptedRefreshToken)) {
      this.rejectUserAuthorization(integration);
    }
    return token;
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

  private async applyConfigFieldHeaders(
    headers: Record<string, string>,
    fields: ConfigField[],
    values: Record<string, string>,
  ): Promise<void> {
    for (const field of fields) {
      if (!field.headerName) continue;

      // Schema-fixed secrets are plaintext; only stored user/org values are encrypted.
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
        observationRevision: mcpConnectionRevision(integration, null, null),
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

      this.logger.log(
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

  listTools(
    integration: McpIntegration,
    userId?: UUID,
    options?: McpRequestOptions,
  ): Promise<McpTool[]> {
    return this.request(integration, userId, 'listTools', (config) =>
      this.optionalList(() => this.mcpClient.listTools(config, options)),
    );
  }

  listResources(
    integration: McpIntegration,
    userId?: UUID,
    options?: McpRequestOptions,
  ): Promise<McpResource[]> {
    return this.request(integration, userId, 'listResources', (config) =>
      this.optionalList(() => this.mcpClient.listResources(config, options)),
    );
  }

  listResourceTemplates(
    integration: McpIntegration,
    userId?: UUID,
    options?: McpRequestOptions,
  ): Promise<McpResource[]> {
    return this.request(
      integration,
      userId,
      'listResourceTemplates',
      (config) =>
        this.optionalList(() =>
          this.mcpClient.listResourceTemplates(config, options),
        ),
    );
  }

  listPrompts(
    integration: McpIntegration,
    userId?: UUID,
    options?: McpRequestOptions,
  ): Promise<McpPrompt[]> {
    return this.request(integration, userId, 'listPrompts', (config) =>
      this.optionalList(() => this.mcpClient.listPrompts(config, options)),
    );
  }

  discoverCapabilities(
    integration: McpIntegration,
    userId: UUID | undefined,
    options: McpRequestOptions,
  ): Promise<DiscoveredCapabilities> {
    return this.request(integration, userId, 'discovery', async (config) => {
      const [tools, resources, resourceTemplates, prompts] = await Promise.all([
        this.optionalList(() => this.mcpClient.listTools(config, options)),
        this.optionalList(() => this.mcpClient.listResources(config, options)),
        this.optionalList(() =>
          this.mcpClient.listResourceTemplates(config, options),
        ),
        this.optionalList(() => this.mcpClient.listPrompts(config, options)),
      ]);
      return { tools, resources, resourceTemplates, prompts };
    });
  }

  callTool(
    integration: McpIntegration,
    call: McpToolCall,
    userId?: UUID,
  ): Promise<McpToolResult> {
    return this.request(
      integration,
      userId,
      'callTool',
      (config) => this.mcpClient.callTool(config, call),
      call.signal,
    );
  }

  readResource(
    integration: McpIntegration,
    uri: string,
    parameters?: Record<string, unknown>,
    userId?: UUID,
    signal?: AbortSignal,
  ): Promise<{ content: unknown; mimeType: string }> {
    return this.request(
      integration,
      userId,
      'readResource',
      (config) => this.mcpClient.readResource(config, uri, parameters),
      signal,
    );
  }

  getPrompt(
    integration: McpIntegration,
    name: string,
    args: Record<string, unknown>,
    userId?: UUID,
  ): Promise<{ messages: unknown[] }> {
    return this.request(integration, userId, 'getPrompt', (config) =>
      this.mcpClient.getPrompt(config, name, args),
    );
  }

  private async request<T>(
    integration: McpIntegration,
    userId: UUID | undefined,
    operation: string,
    send: (config: McpConnectionConfig) => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    signal?.throwIfAborted();
    const config = await this.buildConnectionConfig(integration, userId);
    const execute = async () => {
      try {
        return await send(config);
      } catch (error) {
        signal?.throwIfAborted();
        return this.handleOperationError(error, integration, operation, userId);
      }
    };
    return this.health
      ? this.health.observe(config, execute, signal)
      : execute();
  }

  private async optionalList<T>(request: () => Promise<T[]>): Promise<T[]> {
    try {
      return await request();
    } catch (error) {
      if (this.isMethodNotFoundError(error)) return [];
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
