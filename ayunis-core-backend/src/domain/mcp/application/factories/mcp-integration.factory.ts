import { Injectable } from '@nestjs/common';
import { McpIntegration } from '../../domain/mcp-integration.entity';
import { McpIntegrationKind } from '../../domain/value-objects/mcp-integration-kind.enum';
import { CustomMcpIntegration } from '../../domain/integrations/custom-mcp-integration.entity';
import { PredefinedMcpIntegration } from '../../domain/integrations/predefined-mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { McpIntegrationAuth } from '../../domain/auth/mcp-integration-auth.entity';

@Injectable()
export class McpIntegrationFactory {
  createIntegration(params: {
    kind: McpIntegrationKind.CUSTOM;
    orgId: string;
    name: string;
    serverUrl: string;
    auth: McpIntegrationAuth;
  }): CustomMcpIntegration;
  createIntegration(params: {
    kind: McpIntegrationKind.PREDEFINED;
    orgId: string;
    name: string;
    serverUrl: string;
    auth: McpIntegrationAuth;
    slug: PredefinedMcpIntegrationSlug;
  }): PredefinedMcpIntegration;
  createIntegration(params: {
    kind: McpIntegrationKind;
    orgId: string;
    name: string;
    serverUrl: string;
    auth: McpIntegrationAuth;
    slug?: PredefinedMcpIntegrationSlug;
  }): McpIntegration {
    const base = {
      orgId: params.orgId,
      name: params.name,
      serverUrl: params.serverUrl,
      auth: params.auth,
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
        throw new Error(`Unknown MCP integration kind: ${params.kind}`);
    }
  }
}
