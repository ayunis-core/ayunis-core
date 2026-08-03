import type { UUID } from 'crypto';
import { SchemaConfiguredMcpIntegration } from './schema-configured-mcp-integration.entity';
import type { McpIntegrationAuth } from '../auth/mcp-integration-auth.entity';
import { McpIntegrationKind } from '../value-objects/mcp-integration-kind.enum';
import type { IntegrationConfigSchema } from '../value-objects/integration-config-schema';

export class CustomMcpIntegration extends SchemaConfiguredMcpIntegration {
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

    this._serverUrl = params.serverUrl;
  }

  get kind(): McpIntegrationKind {
    return McpIntegrationKind.CUSTOM;
  }

  get serverUrl(): string {
    return this._serverUrl;
  }
}
