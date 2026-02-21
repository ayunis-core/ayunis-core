import type { UUID } from 'crypto';
import { McpIntegration } from '../mcp-integration.entity';
import type { McpIntegrationAuth } from '../auth/mcp-integration-auth.entity';
import { McpIntegrationKind } from '../value-objects/mcp-integration-kind.enum';
import type { IntegrationConfigSchema } from '../value-objects/integration-config-schema';

/**
 * MCP integration installed from the Ayunis marketplace.
 * Auth is handled via config fields → headers rather than the legacy auth entity hierarchy.
 * The auth entity is always NoAuthMcpIntegrationAuth.
 */
export class MarketplaceMcpIntegration extends McpIntegration {
  public readonly marketplaceIdentifier: string;
  public readonly configSchema: IntegrationConfigSchema;
  private _orgConfigValues: Record<string, string>;
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
    enabled?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    connectionStatus?: string;
    lastConnectionError?: string;
    lastConnectionCheck?: Date;
    returnsPii?: boolean;
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
      auth: params.auth,
    });

    this.marketplaceIdentifier = params.marketplaceIdentifier;
    this.configSchema = params.configSchema;
    this._orgConfigValues = { ...params.orgConfigValues };
    this._serverUrl = params.serverUrl;
  }

  get kind(): McpIntegrationKind {
    return McpIntegrationKind.MARKETPLACE;
  }

  get serverUrl(): string {
    return this._serverUrl;
  }

  get orgConfigValues(): Record<string, string> {
    return { ...this._orgConfigValues };
  }

  updateOrgConfigValues(values: Record<string, string>): void {
    this._orgConfigValues = { ...values };
    this.touch();
  }
}
