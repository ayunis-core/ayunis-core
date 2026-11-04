import { randomUUID } from 'crypto';
import { MarketplaceMcpIntegration } from './marketplace-mcp-integration.entity';
import { McpIntegrationKind } from 'src/domain/mcp/domain/value-objects/mcp-integration-kind.enum';
import { NoAuthMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/no-auth-mcp-integration-auth.entity';
import type { IntegrationConfigSchema } from 'src/domain/mcp/domain/value-objects/integration-config-schema';

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
    expect(integration.logoUrl).toBeNull();
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

  it('should store logoUrl when provided', () => {
    const integration = new MarketplaceMcpIntegration({
      orgId,
      name: 'OParl Integration',
      serverUrl: 'https://oparl-mcp.ayunis.de/mcp',
      marketplaceIdentifier: 'oparl',
      configSchema,
      orgConfigValues: {},
      auth: new NoAuthMcpIntegrationAuth(),
      logoUrl: 'https://marketplace.ayunis.de/logos/oparl.png',
    });

    expect(integration.logoUrl).toBe(
      'https://marketplace.ayunis.de/logos/oparl.png',
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

  describe('server URL', () => {
    function build(
      overrides: Partial<
        ConstructorParameters<typeof MarketplaceMcpIntegration>[0]
      > = {},
    ): MarketplaceMcpIntegration {
      return new MarketplaceMcpIntegration({
        orgId,
        name: 'OpenProject',
        serverUrl: 'https://projekte.stadt.de/mcp',
        marketplaceIdentifier: 'openproject',
        configSchema,
        orgConfigValues: {},
        auth: new NoAuthMcpIntegrationAuth(),
        ...overrides,
      });
    }

    it('uses the marketplace server URL by default', () => {
      const integration = build();

      expect(integration.customerProvidesServerUrl).toBe(false);
      expect(integration.serverUrlHint).toBeNull();
    });

    it('keeps the customer-provided flag and hint', () => {
      const integration = build({
        customerProvidesServerUrl: true,
        serverUrlHint: 'Your OpenProject MCP address',
      });

      expect(integration.customerProvidesServerUrl).toBe(true);
      expect(integration.serverUrlHint).toBe('Your OpenProject MCP address');
    });

    it('lets the org change a customer-provided server URL', () => {
      const integration = build({ customerProvidesServerUrl: true });
      const previousUpdatedAt = integration.updatedAt;

      integration.updateServerUrl('https://andere.stadt.de/mcp');

      expect(integration.serverUrl).toBe('https://andere.stadt.de/mcp');
      expect(integration.updatedAt.getTime()).toBeGreaterThanOrEqual(
        previousUpdatedAt.getTime(),
      );
    });

    it('refuses to change a server URL fixed by the marketplace', () => {
      const integration = build();

      expect(() =>
        integration.updateServerUrl('https://evil.example.com/mcp'),
      ).toThrow();
      expect(integration.serverUrl).toBe('https://projekte.stadt.de/mcp');
    });
  });

  describe('per-user authorization', () => {
    const requiredUserField = {
      key: 'personalToken',
      label: 'Personal Access Token',
      type: 'secret' as const,
      headerName: 'Authorization',
      prefix: 'Bearer ',
      required: true,
    };

    function build(schema: IntegrationConfigSchema): MarketplaceMcpIntegration {
      return new MarketplaceMcpIntegration({
        orgId,
        name: 'Integration',
        serverUrl: 'https://example.com/mcp',
        marketplaceIdentifier: 'id',
        configSchema: schema,
        orgConfigValues: {},
        auth: new NoAuthMcpIntegrationAuth(),
      });
    }

    it('does not require authorization when there are no required user fields', () => {
      const integration = build(configSchema); // userField is optional
      expect(integration.requiresUserAuthorization).toBe(false);
      expect(integration.isUserAuthorized(null)).toBe(true);
    });

    it('requires authorization when a required user field exists', () => {
      const integration = build({
        authType: 'BEARER_TOKEN',
        orgFields: [],
        userFields: [requiredUserField],
      });
      expect(integration.requiresUserAuthorization).toBe(true);
    });

    it('is unauthorized when the required user value is missing, empty, or whitespace', () => {
      const integration = build({
        authType: 'BEARER_TOKEN',
        orgFields: [],
        userFields: [requiredUserField],
      });
      expect(integration.isUserAuthorized(null)).toBe(false);
      expect(integration.isUserAuthorized({})).toBe(false);
      expect(integration.isUserAuthorized({ personalToken: '' })).toBe(false);
      expect(integration.isUserAuthorized({ personalToken: '   ' })).toBe(
        false,
      );
    });

    it('is authorized when every required user value is provided', () => {
      const integration = build({
        authType: 'BEARER_TOKEN',
        orgFields: [],
        userFields: [requiredUserField],
      });
      expect(integration.isUserAuthorized({ personalToken: 'tok' })).toBe(true);
    });

    it('treats a required field with a system-fixed value as already satisfied', () => {
      const integration = build({
        authType: 'BEARER_TOKEN',
        orgFields: [],
        userFields: [{ ...requiredUserField, value: 'fixed' }],
      });
      expect(integration.requiresUserAuthorization).toBe(false);
      expect(integration.isUserAuthorized(null)).toBe(true);
    });
  });
});
