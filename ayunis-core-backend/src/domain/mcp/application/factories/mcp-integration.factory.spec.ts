import { randomUUID } from 'crypto';
import { McpIntegrationFactory } from './mcp-integration.factory';
import { McpIntegrationKind } from '../../domain/value-objects/mcp-integration-kind.enum';
import { PredefinedMcpIntegrationSlug } from '../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { NoAuthMcpIntegrationAuth } from '../../domain/auth/no-auth-mcp-integration-auth.entity';
import { BearerMcpIntegrationAuth } from '../../domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from '../../domain/auth/custom-header-mcp-integration-auth.entity';
import { OAuthMcpIntegrationAuth } from '../../domain/auth/oauth-mcp-integration-auth.entity';
import { CustomMcpIntegration } from '../../domain/integrations/custom-mcp-integration.entity';
import { PredefinedMcpIntegration } from '../../domain/integrations/predefined-mcp-integration.entity';
import { MarketplaceMcpIntegration } from '../../domain/integrations/marketplace-mcp-integration.entity';
import { IntegrationConfigSchema } from '../../domain/value-objects/integration-config-schema';

describe('McpIntegrationFactory', () => {
  const orgId = randomUUID();
  const name = 'Test Integration';
  const serverUrl = 'http://localhost:3000';
  let factory: McpIntegrationFactory;

  beforeEach(() => {
    factory = new McpIntegrationFactory();
  });

  describe('createIntegration', () => {
    it('creates custom integrations with provided auth', () => {
      const auth = new NoAuthMcpIntegrationAuth();
      const integration = factory.createIntegration({
        kind: McpIntegrationKind.CUSTOM,
        orgId,
        name,
        serverUrl,
        auth,
      });

      expect(integration).toBeInstanceOf(CustomMcpIntegration);
      expect(integration.kind).toBe(McpIntegrationKind.CUSTOM);
      expect(integration.auth).toBe(auth);
      expect(integration.serverUrl).toBe(serverUrl);
    });

    it('creates predefined integrations with slug and auth', () => {
      const auth = new BearerMcpIntegrationAuth({ authToken: 'token' });
      const integration = factory.createIntegration({
        kind: McpIntegrationKind.PREDEFINED,
        orgId,
        name,
        serverUrl,
        auth,
        slug: PredefinedMcpIntegrationSlug.TEST,
      });

      expect(integration).toBeInstanceOf(PredefinedMcpIntegration);
      expect(integration.kind).toBe(McpIntegrationKind.PREDEFINED);
      expect(integration.slug).toBe(PredefinedMcpIntegrationSlug.TEST);
      expect(integration.auth).toBe(auth);
    });

    it('throws when predefined integration is missing slug', () => {
      const auth = new BearerMcpIntegrationAuth({ authToken: 'token' });

      expect(() =>
        factory.createIntegration({
          kind: McpIntegrationKind.PREDEFINED,
          orgId,
          name,
          serverUrl,
          auth,
          slug: undefined as any,
        }),
      ).toThrow('Predefined integrations require a slug');
    });

    it('supports bearer authentication tokens', () => {
      const auth = new BearerMcpIntegrationAuth({ authToken: 'encrypted' });
      const integration = factory.createIntegration({
        kind: McpIntegrationKind.CUSTOM,
        orgId,
        name,
        serverUrl,
        auth,
      });

      expect(integration.auth).toBeInstanceOf(BearerMcpIntegrationAuth);
      expect((integration.auth as BearerMcpIntegrationAuth).authToken).toBe(
        'encrypted',
      );
    });

    it('supports custom header authentication', () => {
      const auth = new CustomHeaderMcpIntegrationAuth({
        secret: 'encrypted-secret',
        headerName: 'X-Auth',
      });
      const integration = factory.createIntegration({
        kind: McpIntegrationKind.CUSTOM,
        orgId,
        name,
        serverUrl,
        auth,
      });

      expect(integration.auth).toBeInstanceOf(CustomHeaderMcpIntegrationAuth);
      expect(
        (integration.auth as CustomHeaderMcpIntegrationAuth).headerName,
      ).toBe('X-Auth');
    });

    it('supports oauth authentication metadata', () => {
      const auth = new OAuthMcpIntegrationAuth({
        clientId: 'client-id',
        clientSecret: 'secret',
      });
      const integration = factory.createIntegration({
        kind: McpIntegrationKind.CUSTOM,
        orgId,
        name,
        serverUrl,
        auth,
      });

      expect(integration.auth).toBeInstanceOf(OAuthMcpIntegrationAuth);
      expect((integration.auth as OAuthMcpIntegrationAuth).clientId).toBe(
        'client-id',
      );
    });

    it('creates marketplace integrations with config schema and org config values', () => {
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
        ],
        userFields: [],
      };
      const auth = new NoAuthMcpIntegrationAuth();

      const integration = factory.createIntegration({
        kind: McpIntegrationKind.MARKETPLACE,
        orgId,
        name,
        serverUrl,
        auth,
        marketplaceIdentifier: 'oparl',
        configSchema,
        orgConfigValues: { authToken: 'encrypted-value' },
      });

      expect(integration).toBeInstanceOf(MarketplaceMcpIntegration);
      expect(integration.kind).toBe(McpIntegrationKind.MARKETPLACE);
      expect(integration.marketplaceIdentifier).toBe('oparl');
      expect(integration.configSchema).toBe(configSchema);
      expect(integration.orgConfigValues).toEqual({
        authToken: 'encrypted-value',
      });
      expect(integration.serverUrl).toBe(serverUrl);
    });

    it('throws when marketplace integration is missing identifier', () => {
      const configSchema: IntegrationConfigSchema = {
        authType: 'NO_AUTH',
        orgFields: [],
        userFields: [],
      };
      const auth = new NoAuthMcpIntegrationAuth();

      expect(() =>
        factory.createIntegration({
          kind: McpIntegrationKind.MARKETPLACE,
          orgId,
          name,
          serverUrl,
          auth,
          marketplaceIdentifier: undefined as any,
          configSchema,
          orgConfigValues: {},
        }),
      ).toThrow('Marketplace integrations require an identifier');
    });

    it('throws when marketplace integration is missing config schema', () => {
      const auth = new NoAuthMcpIntegrationAuth();

      expect(() =>
        factory.createIntegration({
          kind: McpIntegrationKind.MARKETPLACE,
          orgId,
          name,
          serverUrl,
          auth,
          marketplaceIdentifier: 'oparl',
          configSchema: undefined as any,
          orgConfigValues: {},
        }),
      ).toThrow('Marketplace integrations require a config schema');
    });
  });
});
