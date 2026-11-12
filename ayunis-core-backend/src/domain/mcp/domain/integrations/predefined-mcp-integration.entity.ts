import type { UUID } from 'crypto';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import type { McpIntegrationAuth } from 'src/domain/mcp/domain/auth/mcp-integration-auth.entity';
import { McpIntegrationKind } from 'src/domain/mcp/domain/value-objects/mcp-integration-kind.enum';
import type { PredefinedMcpIntegrationSlug } from 'src/domain/mcp/domain/value-objects/predefined-mcp-integration-slug.enum';

export class PredefinedMcpIntegration extends McpIntegration {
  public readonly slug: PredefinedMcpIntegrationSlug;
  private readonly _serverUrl: string;

  constructor(params: {
    id?: UUID;
    orgId: UUID;
    name: string;
    slug: PredefinedMcpIntegrationSlug;
    serverUrl: string;
    auth: McpIntegrationAuth;
    enabled?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    connectionStatus?: string;
    lastConnectionError?: string;
    lastConnectionCheck?: Date;
    returnsPii?: boolean;
    description?: string;
    instructions?: string | null;
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
      instructions: params.instructions,
      auth: params.auth,
    });

    this.slug = params.slug;
    this._serverUrl = params.serverUrl;
  }

  get kind(): McpIntegrationKind {
    return McpIntegrationKind.PREDEFINED;
  }

  get serverUrl(): string {
    return this._serverUrl;
  }
}
