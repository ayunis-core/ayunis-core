import type { UUID } from 'crypto';
import { McpIntegration } from '../mcp-integration.entity';
import type { McpIntegrationAuth } from '../auth/mcp-integration-auth.entity';
import { McpIntegrationKind } from '../value-objects/mcp-integration-kind.enum';
import type { IntegrationConfigSchema } from '../value-objects/integration-config-schema';

/**
 * MCP integration authored locally by an org admin via a raw configuration
 * schema. Reuses the same `IntegrationConfigSchema` shape as marketplace
 * integrations, but is not associated with a marketplace identifier or logo.
 *
 * Auth is handled via config fields → headers (and optionally OAuth managed
 * by the dedicated OAuth token table) rather than the legacy auth entity
 * hierarchy. The auth entity is always `NoAuthMcpIntegrationAuth`.
 */
export class SelfDefinedMcpIntegration extends McpIntegration {
  public readonly configSchema: IntegrationConfigSchema;
  private _orgConfigValues: Record<string, string>;
  private readonly _serverUrl: string;

  constructor(params: {
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

  get kind(): McpIntegrationKind {
    return McpIntegrationKind.SELF_DEFINED;
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
