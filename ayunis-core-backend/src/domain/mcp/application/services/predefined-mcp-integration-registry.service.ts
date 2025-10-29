import { Injectable } from '@nestjs/common';
import { PredefinedMcpIntegrationSlug } from '../../domain/predefined-mcp-integration-slug.enum';
import { McpAuthMethod } from '../../domain/mcp-auth-method.enum';

export interface PredefinedMcpIntegrationConfig {
  slug: PredefinedMcpIntegrationSlug;
  displayName: string;
  description: string;
  url: string;
  defaultAuthMethod?: McpAuthMethod;
  defaultAuthHeaderName?: string;
}

@Injectable()
export class PredefinedMcpIntegrationRegistryService {
  private readonly configs: Record<
    PredefinedMcpIntegrationSlug,
    PredefinedMcpIntegrationConfig
  > = {
    [PredefinedMcpIntegrationSlug.TEST]: {
      slug: PredefinedMcpIntegrationSlug.TEST,
      displayName: 'Test MCP Server',
      description: 'Test integration for development and testing',
      url: 'http://localhost:3100/mcp',
      defaultAuthMethod: undefined, // No auth required
    },
  };

  getConfig(
    slug: PredefinedMcpIntegrationSlug,
  ): PredefinedMcpIntegrationConfig {
    const config = this.configs[slug];
    if (!config) {
      throw new Error(`Unknown predefined MCP integration slug: ${slug}`);
    }
    return config;
  }

  getAllConfigs(): PredefinedMcpIntegrationConfig[] {
    return Object.values(this.configs);
  }

  isValidSlug(slug: string): slug is PredefinedMcpIntegrationSlug {
    return slug in this.configs;
  }
}
