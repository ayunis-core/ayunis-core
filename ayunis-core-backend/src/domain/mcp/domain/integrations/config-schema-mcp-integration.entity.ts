import type { UUID } from 'crypto';
import { McpIntegration } from '../mcp-integration.entity';
import type { McpIntegrationAuth } from '../auth/mcp-integration-auth.entity';
import type { IntegrationConfigSchema } from '../value-objects/integration-config-schema';

/**
 * Abstract intermediate base for integrations that carry a config schema,
 * org-level config values, and a fixed server URL (currently
 * `MarketplaceMcpIntegration` and `SelfDefinedMcpIntegration`).
 *
 * Centralises the defensive-copy getter, the spread-then-touch update
 * method, and the readonly `serverUrl` so that bug-fixes and behaviour
 * changes only need to happen in one place.
 */
export abstract class ConfigSchemaMcpIntegration extends McpIntegration {
  public readonly configSchema: IntegrationConfigSchema;
  private _orgConfigValues: Record<string, string>;
  private readonly _serverUrl: string;

  protected constructor(params: {
    id?: UUID;
    orgId: UUID;
    name: string;
    serverUrl: string;
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
    description?: string;
    oauthClientId?: string;
    oauthClientSecretEncrypted?: string;
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
      oauthClientId: params.oauthClientId,
      oauthClientSecretEncrypted: params.oauthClientSecretEncrypted,
    });

    this.configSchema = params.configSchema;
    this._orgConfigValues = { ...params.orgConfigValues };
    this._serverUrl = params.serverUrl;
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
