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
    const isDevelopment = this.configService.get<boolean>('app.isDevelopment');
    if (isDevelopment) {
      // Test integration (no auth)
      this.configs.set(PredefinedMcpIntegrationSlug.TEST, {
        slug: PredefinedMcpIntegrationSlug.TEST,
        displayName: 'Test MCP Server',
        description: 'Test integration for development and testing',
        serverUrl: 'http://localhost:3100/mcp',
        authType: McpAuthMethod.NO_AUTH,
      });
    }

    // Locaboo integration (Bearer token auth)
    const locabooUrl = this.configService.get<string>('LOCABOO_4_URL');
    if (locabooUrl) {
      const locabooServerUrl = `${locabooUrl.replace(/\/$/, '')}`;
      this.configs.set(PredefinedMcpIntegrationSlug.LOCABOO, {
        slug: PredefinedMcpIntegrationSlug.LOCABOO,
        displayName: 'Locaboo',
        description:
          'Verbinden Sie Ihren Locaboo Account, um Zugriff auf Buchungen, Ressourcen, und andere Locaboo Datenzu erhalten',
        authType: McpAuthMethod.BEARER_TOKEN,
        authHeaderName: 'Authorization',
        serverUrl: locabooServerUrl,
        credentialFields: [
          {
            label: 'Locaboo API Token',
            type: CredentialFieldType.TOKEN,
            required: true,
            help: 'Sie finden Ihren API Token in Ihren persönlichen Einstellungen unter dem Menüpunkt "Konto"',
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
      return `${baseUrl.replace(/\/$/, '')}/mcp`;
    }

    if (slug === PredefinedMcpIntegrationSlug.TEST) {
      return 'http://localhost:3100/mcp';
    }

    throw new Error(
      `No server URL configured for integration: ${slug as string}`,
    );
  }
}
