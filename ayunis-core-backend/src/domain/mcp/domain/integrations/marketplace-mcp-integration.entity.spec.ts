import { randomUUID } from 'crypto';
import { MarketplaceMcpIntegration } from './marketplace-mcp-integration.entity';
import { McpIntegrationKind } from '../value-objects/mcp-integration-kind.enum';
import { NoAuthMcpIntegrationAuth } from '../auth/no-auth-mcp-integration-auth.entity';
import { IntegrationConfigSchema } from '../value-objects/integration-config-schema';

describe('MarketplaceMcpIntegration', () => {
  const orgId = randomUUID();
  const configSchema: IntegrationConfigSchema = {
    authType: 'BEARER_TOKEN',
    orgFields: [
      {
        key: 'authToken',
        label: 'API Token',
        type: 'secret',
        headerName: 'Authorization',
        prefix: 'Bearer ',
        required: true,
      },
      {
        key: 'oparlEndpointUrl',
        label: 'OParl Endpoint URL',
        type: 'url',
        headerName: 'X-Oparl-Endpoint-Url',
        required: true,
        help: "Your municipality's OParl system endpoint URL",
      },
    ],
    userFields: [
      {
        key: 'personalToken',
        label: 'Personal Access Token',
        type: 'secret',
        headerName: 'Authorization',
        prefix: 'Bearer ',
        required: false,
        help: 'Optional — overrides the org-wide token',
      },
    ],
  };

  it('should create with marketplace kind', () => {
    const integration = new MarketplaceMcpIntegration({
      orgId,
      name: 'OParl Integration',
      serverUrl: 'https://oparl-mcp.ayunis.de/mcp',
      marketplaceIdentifier: 'oparl',
      configSchema,
      orgConfigValues: {
        authToken: 'encrypted-token-value',
        oparlEndpointUrl: 'https://rim.ekom21.de/oparl/v1',
      },
      auth: new NoAuthMcpIntegrationAuth(),
    });

    expect(integration.kind).toBe(McpIntegrationKind.MARKETPLACE);
  });

  it('should expose marketplace-specific properties', () => {
    const integration = new MarketplaceMcpIntegration({
      orgId,
      name: 'OParl Integration',
      serverUrl: 'https://oparl-mcp.ayunis.de/mcp',
      marketplaceIdentifier: 'oparl',
      configSchema,
      orgConfigValues: {
        authToken: 'encrypted-token-value',
        oparlEndpointUrl: 'https://rim.ekom21.de/oparl/v1',
      },
      auth: new NoAuthMcpIntegrationAuth(),
    });

    expect(integration.marketplaceIdentifier).toBe('oparl');
    expect(integration.configSchema).toBe(configSchema);
    expect(integration.orgConfigValues).toEqual({
      authToken: 'encrypted-token-value',
      oparlEndpointUrl: 'https://rim.ekom21.de/oparl/v1',
    });
    expect(integration.serverUrl).toBe('https://oparl-mcp.ayunis.de/mcp');
  });

  it('should be identified as marketplace via isMarketplace()', () => {
    const integration = new MarketplaceMcpIntegration({
      orgId,
      name: 'OParl Integration',
      serverUrl: 'https://oparl-mcp.ayunis.de/mcp',
      marketplaceIdentifier: 'oparl',
      configSchema,
      orgConfigValues: {},
      auth: new NoAuthMcpIntegrationAuth(),
    });

    expect(integration.isMarketplace()).toBe(true);
    expect(integration.isPredefined()).toBe(false);
    expect(integration.isCustom()).toBe(false);
  });

  it('should allow updating org config values', () => {
    const integration = new MarketplaceMcpIntegration({
      orgId,
      name: 'OParl Integration',
      serverUrl: 'https://oparl-mcp.ayunis.de/mcp',
      marketplaceIdentifier: 'oparl',
      configSchema,
      orgConfigValues: { authToken: 'old-token' },
      auth: new NoAuthMcpIntegrationAuth(),
    });

    const previousUpdatedAt = integration.updatedAt;

    integration.updateOrgConfigValues({ authToken: 'new-token' });

    expect(integration.orgConfigValues).toEqual({ authToken: 'new-token' });
    expect(integration.updatedAt.getTime()).toBeGreaterThanOrEqual(
      previousUpdatedAt.getTime(),
    );
  });

  it('should default to empty org config values', () => {
    const integration = new MarketplaceMcpIntegration({
      orgId,
      name: 'Zero Config Integration',
      serverUrl: 'https://example.com/mcp',
      marketplaceIdentifier: 'zero-config',
      configSchema: {
        authType: 'BEARER_TOKEN',
        orgFields: [
          {
            key: 'token',
            type: 'secret',
            label: 'Token',
            headerName: 'Authorization',
            prefix: 'Bearer ',
            required: true,
            value: 'sk-fixed-token',
          },
        ],
        userFields: [],
      },
      orgConfigValues: {},
      auth: new NoAuthMcpIntegrationAuth(),
    });

    expect(integration.orgConfigValues).toEqual({});
  });
});
