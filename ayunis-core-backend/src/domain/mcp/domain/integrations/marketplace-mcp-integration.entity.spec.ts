import { randomUUID } from 'crypto';
import { MarketplaceMcpIntegration } from './marketplace-mcp-integration.entity';
import { McpIntegrationKind } from '../value-objects/mcp-integration-kind.enum';
import { NoAuthMcpIntegrationAuth } from '../auth/no-auth-mcp-integration-auth.entity';
import type { IntegrationConfigSchema } from '../value-objects/integration-config-schema';

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

  it('should round-trip OAuth client credentials passed through the constructor', () => {
    const integration = new MarketplaceMcpIntegration({
      orgId,
      name: 'OParl Integration',
      serverUrl: 'https://oparl-mcp.ayunis.de/mcp',
      marketplaceIdentifier: 'oparl',
      configSchema,
      orgConfigValues: {},
      auth: new NoAuthMcpIntegrationAuth(),
      oauthClientId: 'client-abc-123',
      oauthClientSecretEncrypted: 'enc-secret-xyz',
    });

    expect(integration.oauthClientId).toBe('client-abc-123');
    expect(integration.oauthClientSecretEncrypted).toBe('enc-secret-xyz');
  });

  it('should not bump updatedAt when OAuth client credentials are passed through the constructor (rehydration path)', () => {
    const fixedUpdatedAt = new Date('2024-01-01T00:00:00.000Z');
    const integration = new MarketplaceMcpIntegration({
      orgId,
      name: 'OParl Integration',
      serverUrl: 'https://oparl-mcp.ayunis.de/mcp',
      marketplaceIdentifier: 'oparl',
      configSchema,
      orgConfigValues: {},
      auth: new NoAuthMcpIntegrationAuth(),
      updatedAt: fixedUpdatedAt,
      oauthClientId: 'client-abc-123',
      oauthClientSecretEncrypted: 'enc-secret-xyz',
    });

    expect(integration.updatedAt).toEqual(fixedUpdatedAt);
  });

  describe('Constructor both-or-neither OAuth client credentials guard', () => {
    const buildMarketplace = (oauth: {
      oauthClientId?: string;
      oauthClientSecretEncrypted?: string;
    }) =>
      new MarketplaceMcpIntegration({
        orgId,
        name: 'OParl Integration',
        serverUrl: 'https://oparl-mcp.ayunis.de/mcp',
        marketplaceIdentifier: 'oparl',
        configSchema,
        orgConfigValues: {},
        auth: new NoAuthMcpIntegrationAuth(),
        ...oauth,
      });

    it('should throw when only oauthClientId is set', () => {
      expect(() =>
        buildMarketplace({ oauthClientId: 'client-abc-123' }),
      ).toThrow(
        'oauthClientId and oauthClientSecretEncrypted must be set together',
      );
    });

    it('should throw when only oauthClientSecretEncrypted is set', () => {
      expect(() =>
        buildMarketplace({ oauthClientSecretEncrypted: 'enc-secret-xyz' }),
      ).toThrow(
        'oauthClientId and oauthClientSecretEncrypted must be set together',
      );
    });

    it('should accept both set together', () => {
      expect(() =>
        buildMarketplace({
          oauthClientId: 'client-abc-123',
          oauthClientSecretEncrypted: 'enc-secret-xyz',
        }),
      ).not.toThrow();
    });

    it('should accept neither set', () => {
      expect(() => buildMarketplace({})).not.toThrow();
    });
  });
});
