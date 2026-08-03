import type { UUID } from 'crypto';
import { SchemaConfiguredMcpIntegration } from './schema-configured-mcp-integration.entity';
import type { McpIntegrationAuth } from '../auth/mcp-integration-auth.entity';
import { McpIntegrationKind } from '../value-objects/mcp-integration-kind.enum';
import type { IntegrationConfigSchema } from '../value-objects/integration-config-schema';

/**
 * MCP integration installed from the Ayunis marketplace.
 * Auth is handled via config fields → headers rather than the legacy auth entity hierarchy.
 * The auth entity is always NoAuthMcpIntegrationAuth.
 */
export class MarketplaceMcpIntegration extends SchemaConfiguredMcpIntegration {
  public readonly marketplaceIdentifier: string;
  public readonly logoUrl: string | null;
  private readonly _serverUrl: string;

  constructor(params: {
    id?: UUID;
    orgId: UUID;
    name: string;
    serverUrl: string;
    marketplaceIdentifier: string;
    configSchema: IntegrationConfigSchema;
    orgConfigValues: Record<string, string>;
    auth: McpIntegrationAuth;
    logoUrl?: string | null;
    enabled?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    connectionStatus?: string;
    lastConnectionError?: string;
    lastConnectionCheck?: Date;
    returnsPii?: boolean;
    description?: string;
  }) {
    super({
      id: params.id,
      orgId: params.orgId,
      name: params.name,
      enabled: params.enabled,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
      connectionStatus: params.connectionStatus,
      lastConnectionError: params.lastConnectionError,
      lastConnectionCheck: params.lastConnectionCheck,
      returnsPii: params.returnsPii,
      description: params.description,
      auth: params.auth,
      configSchema: params.configSchema,
      orgConfigValues: params.orgConfigValues,
    });

    this.marketplaceIdentifier = params.marketplaceIdentifier;
    this.logoUrl = params.logoUrl ?? null;
    this._serverUrl = params.serverUrl;
  }

  get kind(): McpIntegrationKind {
    return McpIntegrationKind.MARKETPLACE;
  }

  get serverUrl(): string {
    return this._serverUrl;
  }
}
