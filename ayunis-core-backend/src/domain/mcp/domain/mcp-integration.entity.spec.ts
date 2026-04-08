import { randomUUID, type UUID } from 'crypto';
import { CustomMcpIntegration } from './integrations/custom-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from './auth/no-auth-mcp-integration-auth.entity';
import { BearerMcpIntegrationAuth } from './auth/bearer-mcp-integration-auth.entity';
import { PredefinedMcpIntegration } from './integrations/predefined-mcp-integration.entity';
import { MarketplaceMcpIntegration } from './integrations/marketplace-mcp-integration.entity';
import { SelfDefinedMcpIntegration } from './integrations/self-defined-mcp-integration.entity';
import { McpIntegration } from './mcp-integration.entity';
import type { McpIntegrationAuth } from './auth/mcp-integration-auth.entity';
import { McpIntegrationKind } from './value-objects/mcp-integration-kind.enum';
import { PredefinedMcpIntegrationSlug } from './value-objects/predefined-mcp-integration-slug.enum';
import { McpAuthMethod } from './value-objects/mcp-auth-method.enum';
import type { IntegrationConfigSchema } from './value-objects/integration-config-schema';

/**
 * Test-only subclass that forwards OAuth client credential fields to the
 * abstract base constructor while declaring `kind === CUSTOM`. Used to
 * exercise the base constructor's kind guard for OAuth client credentials
 * — a real CustomMcpIntegration cannot reach the guard because its
 * constructor doesn't expose those fields.
 */
class TestCustomMcpIntegrationForwardingOAuth extends McpIntegration {
  private readonly _serverUrl: string;

  constructor(params: {
    orgId: UUID;
    name: string;
    serverUrl: string;
    auth: McpIntegrationAuth;
    oauthClientId?: string;
    oauthClientSecretEncrypted?: string;
  }) {
    super({
      orgId: params.orgId,
      name: params.name,
      auth: params.auth,
      oauthClientId: params.oauthClientId,
      oauthClientSecretEncrypted: params.oauthClientSecretEncrypted,
    });
    this._serverUrl = params.serverUrl;
  }

  get kind(): McpIntegrationKind {
    return McpIntegrationKind.CUSTOM;
  }

  get serverUrl(): string {
    return this._serverUrl;
  }
}

describe('McpIntegration (Base Class)', () => {
  describe('Common base class behavior', () => {
    it('should generate a UUID when id is not provided', () => {
      const integration = new CustomMcpIntegration({
        name: 'Test Integration',
        orgId: randomUUID(),
        serverUrl: 'http://localhost:3000',
        auth: new NoAuthMcpIntegrationAuth(),
      });

      expect(integration.id).toBeDefined();
      expect(integration.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should use provided UUID when id is provided', () => {
      const providedId = randomUUID();
      const orgId = randomUUID();
      const integration = new CustomMcpIntegration({
        id: providedId,
        name: 'Test Integration',
        orgId,
        serverUrl: 'http://localhost:3000',
        auth: new NoAuthMcpIntegrationAuth(),
      });

      expect(integration.id).toBe(providedId);
    });

    it('should set default values correctly', () => {
      const orgId = randomUUID();
      const integration = new CustomMcpIntegration({
        name: 'Test Integration',
        orgId,
        serverUrl: 'http://localhost:3000',
        auth: new NoAuthMcpIntegrationAuth(),
      });

      expect(integration.name).toBe('Test Integration');
      expect(integration.orgId).toBe(orgId);
      expect(integration.serverUrl).toBe('http://localhost:3000');
      expect(integration.enabled).toBe(true);
      expect(integration.connectionStatus).toBe('pending');
      expect(integration.createdAt).toBeInstanceOf(Date);
      expect(integration.updatedAt).toBeInstanceOf(Date);
      expect(integration.getAuthType()).toBe(McpAuthMethod.NO_AUTH);
      expect(integration.auth.hasCredentials()).toBe(false);
    });

    it('should disable the integration and update timestamp', () => {
      const integration = new CustomMcpIntegration({
        name: 'Test Integration',
        orgId: randomUUID(),
        serverUrl: 'http://localhost:3000',
        auth: new NoAuthMcpIntegrationAuth(),
        enabled: true,
      });

      const beforeDisable = new Date();

      integration.disable();

      expect(integration.enabled).toBe(false);
      expect(integration.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeDisable.getTime(),
      );
    });

    it('should enable the integration and update timestamp', () => {
      const integration = new CustomMcpIntegration({
        name: 'Test Integration',
        orgId: randomUUID(),
        serverUrl: 'http://localhost:3000',
        auth: new NoAuthMcpIntegrationAuth(),
        enabled: false,
      });

      const beforeEnable = new Date();

      integration.enable();

      expect(integration.enabled).toBe(true);
      expect(integration.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeEnable.getTime(),
      );
    });

    it('should update name and timestamp', () => {
      const integration = new CustomMcpIntegration({
        name: 'Old Name',
        orgId: randomUUID(),
        serverUrl: 'http://localhost:3000',
        auth: new NoAuthMcpIntegrationAuth(),
      });

      const beforeUpdate = new Date();

      integration.updateName('New Name');

      expect(integration.name).toBe('New Name');
      expect(integration.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime(),
      );
    });

    it('should update connection status with error', () => {
      const integration = new CustomMcpIntegration({
        name: 'Test Integration',
        orgId: randomUUID(),
        serverUrl: 'http://localhost:3000',
        auth: new NoAuthMcpIntegrationAuth(),
      });

      const beforeUpdate = new Date();

      integration.updateConnectionStatus('error', 'Connection failed');

      expect(integration.connectionStatus).toBe('error');
      expect(integration.lastConnectionError).toBe('Connection failed');
      expect(integration.lastConnectionCheck).toBeInstanceOf(Date);
      expect(integration.lastConnectionCheck!.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime(),
      );
    });

    it('should update connection status to connected without error', () => {
      const integration = new CustomMcpIntegration({
        name: 'Test Integration',
        orgId: randomUUID(),
        serverUrl: 'http://localhost:3000',
        auth: new NoAuthMcpIntegrationAuth(),
      });

      integration.updateConnectionStatus('connected');

      expect(integration.connectionStatus).toBe('connected');
      expect(integration.lastConnectionError).toBeUndefined();
      expect(integration.lastConnectionCheck).toBeInstanceOf(Date);
    });
  });

  describe('Predefined vs Custom distinction', () => {
    it('should identify predefined integration correctly', () => {
      const auth = new BearerMcpIntegrationAuth({ authToken: 'token' });
      const orgId = randomUUID();
      const integration = new PredefinedMcpIntegration({
        name: 'Predefined Integration',
        orgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'http://localhost:3000',
        auth,
      });

      expect(integration.kind).toBe(McpIntegrationKind.PREDEFINED);
      expect(integration.isPredefined()).toBe(true);
      expect(integration.isCustom()).toBe(false);
      expect(integration.slug).toBe(PredefinedMcpIntegrationSlug.TEST);
      expect(integration.getAuthType()).toBe(McpAuthMethod.BEARER_TOKEN);
    });

    it('should identify custom integration correctly', () => {
      const integration = new CustomMcpIntegration({
        name: 'Custom Integration',
        orgId: randomUUID(),
        serverUrl: 'http://custom-server:3000',
        auth: new BearerMcpIntegrationAuth({ authToken: 'token' }),
      });

      expect(integration.kind).toBe(McpIntegrationKind.CUSTOM);
      expect(integration.isPredefined()).toBe(false);
      expect(integration.isCustom()).toBe(true);
      expect(integration.serverUrl).toBe('http://custom-server:3000');
    });

    it('allows replacing authentication strategy', () => {
      const integration = new CustomMcpIntegration({
        name: 'Custom Integration',
        orgId: randomUUID(),
        serverUrl: 'http://custom-server:3000',
        auth: new NoAuthMcpIntegrationAuth(),
      });

      const bearerAuth = new BearerMcpIntegrationAuth({ authToken: 'token' });
      integration.setAuth(bearerAuth);

      expect(integration.auth).toBe(bearerAuth);
      expect(integration.getAuthType()).toBe(McpAuthMethod.BEARER_TOKEN);
    });

    it('should report isSelfDefined() === false for non-self-defined integrations', () => {
      const integration = new CustomMcpIntegration({
        name: 'Custom Integration',
        orgId: randomUUID(),
        serverUrl: 'https://custom-server.example.org/mcp',
        auth: new NoAuthMcpIntegrationAuth(),
      });

      expect(integration.isSelfDefined()).toBe(false);
    });
  });

  describe('OAuth client credentials', () => {
    const noAuthConfigSchema: IntegrationConfigSchema = {
      authType: 'NO_AUTH',
      orgFields: [],
      userFields: [],
    };

    const makeMarketplace = () =>
      new MarketplaceMcpIntegration({
        name: 'Marketplace Integration',
        orgId: randomUUID(),
        serverUrl: 'https://marketplace.example.org/mcp',
        marketplaceIdentifier: 'oparl',
        configSchema: noAuthConfigSchema,
        orgConfigValues: {},
        auth: new NoAuthMcpIntegrationAuth(),
      });

    const makeSelfDefined = () =>
      new SelfDefinedMcpIntegration({
        name: 'Self-defined Integration',
        orgId: randomUUID(),
        serverUrl: 'https://self-defined.example.org/mcp',
        configSchema: noAuthConfigSchema,
        orgConfigValues: {},
        auth: new NoAuthMcpIntegrationAuth(),
      });

    it('should default oauthClientId and oauthClientSecretEncrypted to undefined on marketplace integrations', () => {
      const integration = makeMarketplace();

      expect(integration.oauthClientId).toBeUndefined();
      expect(integration.oauthClientSecretEncrypted).toBeUndefined();
    });

    it('should set OAuth client credentials on a marketplace integration and refresh updatedAt', () => {
      const integration = makeMarketplace();

      const previousUpdatedAt = integration.updatedAt;

      integration.setOAuthClientCredentials('client-abc-123', 'enc-secret-xyz');

      expect(integration.oauthClientId).toBe('client-abc-123');
      expect(integration.oauthClientSecretEncrypted).toBe('enc-secret-xyz');
      expect(integration.updatedAt.getTime()).toBeGreaterThanOrEqual(
        previousUpdatedAt.getTime(),
      );
    });

    it('should set OAuth client credentials on a self-defined integration', () => {
      const integration = makeSelfDefined();

      integration.setOAuthClientCredentials('client-abc-123', 'enc-secret-xyz');

      expect(integration.oauthClientId).toBe('client-abc-123');
      expect(integration.oauthClientSecretEncrypted).toBe('enc-secret-xyz');
    });

    it('should clear previously set OAuth client credentials on a marketplace integration', () => {
      const integration = makeMarketplace();

      integration.setOAuthClientCredentials('client-abc-123', 'enc-secret-xyz');

      const previousUpdatedAt = integration.updatedAt;

      integration.clearOAuthClientCredentials();

      expect(integration.oauthClientId).toBeUndefined();
      expect(integration.oauthClientSecretEncrypted).toBeUndefined();
      expect(integration.updatedAt.getTime()).toBeGreaterThanOrEqual(
        previousUpdatedAt.getTime(),
      );
    });

    it('should throw when setOAuthClientCredentials is called on a CustomMcpIntegration', () => {
      const integration = new CustomMcpIntegration({
        name: 'Custom Integration',
        orgId: randomUUID(),
        serverUrl: 'https://custom-server.example.org/mcp',
        auth: new NoAuthMcpIntegrationAuth(),
      });

      expect(() =>
        integration.setOAuthClientCredentials(
          'client-abc-123',
          'enc-secret-xyz',
        ),
      ).toThrow(
        /OAuth client credentials are only supported for MARKETPLACE and SELF_DEFINED integrations/,
      );
      expect(integration.oauthClientId).toBeUndefined();
      expect(integration.oauthClientSecretEncrypted).toBeUndefined();
    });

    it('should throw when clearOAuthClientCredentials is called on a CustomMcpIntegration', () => {
      const integration = new CustomMcpIntegration({
        name: 'Custom Integration',
        orgId: randomUUID(),
        serverUrl: 'https://custom-server.example.org/mcp',
        auth: new NoAuthMcpIntegrationAuth(),
      });

      expect(() => integration.clearOAuthClientCredentials()).toThrow(
        /OAuth client credentials are only supported for MARKETPLACE and SELF_DEFINED integrations/,
      );
    });

    it('should throw when setOAuthClientCredentials is called on a PredefinedMcpIntegration', () => {
      const integration = new PredefinedMcpIntegration({
        name: 'Predefined Integration',
        orgId: randomUUID(),
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'https://predefined.example.org/mcp',
        auth: new BearerMcpIntegrationAuth({ authToken: 'token' }),
      });

      expect(() =>
        integration.setOAuthClientCredentials(
          'client-abc-123',
          'enc-secret-xyz',
        ),
      ).toThrow(
        /OAuth client credentials are only supported for MARKETPLACE and SELF_DEFINED integrations/,
      );
    });

    it('should throw when clearOAuthClientCredentials is called on a PredefinedMcpIntegration', () => {
      const integration = new PredefinedMcpIntegration({
        name: 'Predefined Integration',
        orgId: randomUUID(),
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'https://predefined.example.org/mcp',
        auth: new BearerMcpIntegrationAuth({ authToken: 'token' }),
      });

      expect(() => integration.clearOAuthClientCredentials()).toThrow(
        /OAuth client credentials are only supported for MARKETPLACE and SELF_DEFINED integrations/,
      );
    });
  });

  describe('Constructor both-or-neither OAuth client credentials guard', () => {
    const configSchema: IntegrationConfigSchema = {
      authType: 'NO_AUTH',
      orgFields: [],
      userFields: [],
    };

    type OAuthCapableKind = 'self-defined' | 'marketplace';
    const buildOAuthCapableIntegration = (
      kind: OAuthCapableKind,
      oauth: {
        oauthClientId?: string;
        oauthClientSecretEncrypted?: string;
      },
    ) => {
      if (kind === 'self-defined') {
        return new SelfDefinedMcpIntegration({
          name: 'Self-defined Integration',
          orgId: randomUUID(),
          serverUrl: 'https://self-defined.example.org/mcp',
          configSchema,
          orgConfigValues: {},
          auth: new NoAuthMcpIntegrationAuth(),
          ...oauth,
        });
      }
      return new MarketplaceMcpIntegration({
        name: 'Marketplace Integration',
        orgId: randomUUID(),
        serverUrl: 'https://marketplace.example.org/mcp',
        marketplaceIdentifier: 'oparl',
        configSchema,
        orgConfigValues: {},
        auth: new NoAuthMcpIntegrationAuth(),
        ...oauth,
      });
    };

    describe.each<OAuthCapableKind>(['self-defined', 'marketplace'])(
      'on a %s integration',
      (kind) => {
        it('should throw when only oauthClientId is set', () => {
          expect(() =>
            buildOAuthCapableIntegration(kind, {
              oauthClientId: 'client-abc-123',
            }),
          ).toThrow(
            'oauthClientId and oauthClientSecretEncrypted must be set together',
          );
        });

        it('should throw when only oauthClientSecretEncrypted is set', () => {
          expect(() =>
            buildOAuthCapableIntegration(kind, {
              oauthClientSecretEncrypted: 'enc-secret-xyz',
            }),
          ).toThrow(
            'oauthClientId and oauthClientSecretEncrypted must be set together',
          );
        });

        it('should accept both set together', () => {
          expect(() =>
            buildOAuthCapableIntegration(kind, {
              oauthClientId: 'client-abc-123',
              oauthClientSecretEncrypted: 'enc-secret-xyz',
            }),
          ).not.toThrow();
        });

        it('should accept neither set', () => {
          expect(() => buildOAuthCapableIntegration(kind, {})).not.toThrow();
        });
      },
    );

    it('should throw when a subclass forwards OAuth client credentials on a CUSTOM-kind integration', () => {
      expect(
        () =>
          new TestCustomMcpIntegrationForwardingOAuth({
            name: 'Custom Integration',
            orgId: randomUUID(),
            serverUrl: 'https://custom-server.example.org/mcp',
            auth: new NoAuthMcpIntegrationAuth(),
            oauthClientId: 'client-abc-123',
            oauthClientSecretEncrypted: 'enc-secret-xyz',
          }),
      ).toThrow(
        /OAuth client credentials are only supported for MARKETPLACE and SELF_DEFINED integrations/,
      );
    });

    it('should expose oauthClientId and oauthClientSecretEncrypted via read-only getters that reflect the values written by setOAuthClientCredentials', () => {
      const integration = new MarketplaceMcpIntegration({
        name: 'Marketplace Integration',
        orgId: randomUUID(),
        serverUrl: 'https://marketplace.example.org/mcp',
        marketplaceIdentifier: 'oparl',
        configSchema,
        orgConfigValues: {},
        auth: new NoAuthMcpIntegrationAuth(),
      });

      integration.setOAuthClientCredentials('client-abc-123', 'enc-secret-xyz');

      expect(integration.oauthClientId).toBe('client-abc-123');
      expect(integration.oauthClientSecretEncrypted).toBe('enc-secret-xyz');
    });
  });
});
