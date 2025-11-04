import { UUID } from 'crypto';
import { McpIntegration } from '../mcp-integration.entity';
import { McpIntegrationAuth } from '../auth/mcp-integration-auth.entity';
import { McpIntegrationKind } from '../value-objects/mcp-integration-kind.enum';

export class CustomMcpIntegration extends McpIntegration {
  private _serverUrl: string;

  constructor(params: {
    id?: UUID;
    orgId: string;
    name: string;
    serverUrl: string;
    auth: McpIntegrationAuth;
    enabled?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    connectionStatus?: string;
    lastConnectionError?: string;
    lastConnectionCheck?: Date;
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
      auth: params.auth,
    });

    this._serverUrl = params.serverUrl;
  }

  get kind(): McpIntegrationKind {
    return McpIntegrationKind.CUSTOM;
  }

  get serverUrl(): string {
    return this._serverUrl;
  }

  updateServerUrl(serverUrl: string): void {
    this._serverUrl = serverUrl;
    this.touch();
  }
}
