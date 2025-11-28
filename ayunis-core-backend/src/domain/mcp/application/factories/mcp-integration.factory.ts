import { Injectable } from '@nestjs/common';
import { McpIntegration } from '../../domain/mcp-integration.entity';
import { McpIntegrationKind } from '../../domain/value-objects/mcp-integration-kind.enum';
import { CustomMcpIntegration } from '../../domain/integrations/custom-mcp-integration.entity';
import { PredefinedMcpIntegration } from '../../domain/integrations/predefined-mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { McpIntegrationAuth } from '../../domain/auth/mcp-integration-auth.entity';
import { UUID } from 'crypto';

@Injectable()
export class McpIntegrationFactory {
  createIntegration(params: {
    kind: McpIntegrationKind.CUSTOM;
    orgId: UUID;
    name: string;
    serverUrl: string;
    auth: McpIntegrationAuth;
    id?: UUID;
    enabled?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    connectionStatus?: string;
    lastConnectionError?: string;
    lastConnectionCheck?: Date;
    returnsPii?: boolean;
  }): CustomMcpIntegration;
  createIntegration(params: {
    kind: McpIntegrationKind.PREDEFINED;
    orgId: UUID;
    name: string;
    serverUrl: string;
    auth: McpIntegrationAuth;
    slug: PredefinedMcpIntegrationSlug;
    id?: UUID;
    enabled?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    connectionStatus?: string;
    lastConnectionError?: string;
    lastConnectionCheck?: Date;
    returnsPii?: boolean;
  }): PredefinedMcpIntegration;
  createIntegration(params: {
    kind: McpIntegrationKind;
    orgId: UUID;
    name: string;
    serverUrl: string;
    auth: McpIntegrationAuth;
    slug?: PredefinedMcpIntegrationSlug;
    id?: UUID;
    enabled?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    connectionStatus?: string;
    lastConnectionError?: string;
    lastConnectionCheck?: Date;
    returnsPii?: boolean;
  }): McpIntegration {
    const base = {
      id: params.id,
      orgId: params.orgId,
      name: params.name,
      serverUrl: params.serverUrl,
      auth: params.auth,
      enabled: params.enabled,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
      connectionStatus: params.connectionStatus,
      lastConnectionError: params.lastConnectionError,
      lastConnectionCheck: params.lastConnectionCheck,
      returnsPii: params.returnsPii,
    } as const;

    switch (params.kind) {
      case McpIntegrationKind.PREDEFINED: {
        if (!params.slug) {
          throw new Error('Predefined integrations require a slug');
        }

        return new PredefinedMcpIntegration({
          ...base,
          slug: params.slug,
        });
      }
      case McpIntegrationKind.CUSTOM:
        return new CustomMcpIntegration(base);
      default:
        throw new Error(
          `Unknown MCP integration kind: ${params.kind as string}`,
        );
    }
  }
}
