import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PredefinedMcpIntegrationSlug } from '../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { McpAuthMethod } from '../../domain/value-objects/mcp-auth-method.enum';
import {
  CredentialFieldType,
  PredefinedMcpIntegrationConfig,
} from '../../domain/predefined-mcp-integration-config';

@Injectable()
export class PredefinedMcpIntegrationRegistry {
  private readonly configs: Map<
    PredefinedMcpIntegrationSlug,
    PredefinedMcpIntegrationConfig
  > = new Map();

  constructor(private readonly configService: ConfigService) {
    this.registerIntegrations();
  }

  private registerIntegrations(): void {
    // Test integration (no auth)
    this.configs.set(PredefinedMcpIntegrationSlug.TEST, {
      slug: PredefinedMcpIntegrationSlug.TEST,
      displayName: 'Test MCP Server',
      description: 'Test integration for development and testing',
      serverUrl: 'http://localhost:3100/mcp',
      authType: McpAuthMethod.NO_AUTH,
    });

    // Locaboo integration (Bearer token auth)
    const locabooUrl = this.configService.get<string>('LOCABOO_4_URL');
    if (locabooUrl) {
      this.configs.set(PredefinedMcpIntegrationSlug.LOCABOO, {
        slug: PredefinedMcpIntegrationSlug.LOCABOO,
        displayName: 'Locaboo 4',
        description:
          'Connect to Locaboo 4 booking system for access to bookings, resources, services, and inventory data',
        authType: McpAuthMethod.BEARER_TOKEN,
        authHeaderName: 'Authorization',
        serverUrl: locabooUrl,
        credentialFields: [
          {
            label: 'Locaboo 3 API Token',
            type: CredentialFieldType.TOKEN,
            required: true,
            help: 'Your Locaboo 3 API token will be used to authenticate with Locaboo 4',
          },
        ],
      });
    }
  }

  getConfig(
    slug: PredefinedMcpIntegrationSlug,
  ): PredefinedMcpIntegrationConfig {
    const config = this.configs.get(slug);
    if (!config) {
      throw new Error(`Unknown predefined MCP integration slug: ${slug}`);
    }
    return config;
  }

  getAllConfigs(): PredefinedMcpIntegrationConfig[] {
    return Array.from(this.configs.values());
  }

  isValidSlug(slug: string): slug is PredefinedMcpIntegrationSlug {
    return (Object.values(PredefinedMcpIntegrationSlug) as string[]).includes(
      slug,
    );
  }

  /**
   * Get the MCP server URL for a predefined integration
   * Reads from environment configuration
   */
  getServerUrl(slug: PredefinedMcpIntegrationSlug): string {
    if (slug === PredefinedMcpIntegrationSlug.LOCABOO) {
      const baseUrl = this.configService.get<string>('LOCABOO_4_URL');
      if (!baseUrl) {
        throw new Error(
          'LOCABOO_4_URL environment variable not configured for Locaboo integration',
        );
      }
      return `${baseUrl}/mcp`;
    }

    if (slug === PredefinedMcpIntegrationSlug.TEST) {
      return 'http://localhost:3100/mcp';
    }

    throw new Error(
      `No server URL configured for integration: ${slug as string}`,
    );
  }
}
