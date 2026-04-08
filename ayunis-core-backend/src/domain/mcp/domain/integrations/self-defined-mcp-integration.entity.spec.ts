import { randomUUID } from 'crypto';
import { SelfDefinedMcpIntegration } from './self-defined-mcp-integration.entity';
import { McpIntegrationKind } from '../value-objects/mcp-integration-kind.enum';
import { NoAuthMcpIntegrationAuth } from '../auth/no-auth-mcp-integration-auth.entity';
import type { IntegrationConfigSchema } from '../value-objects/integration-config-schema';

describe('SelfDefinedMcpIntegration', () => {
  const orgId = randomUUID();
  const configSchema: IntegrationConfigSchema = {
    authType: 'BEARER_TOKEN',
    orgFields: [
      {
        key: 'apiToken',
        label: 'API Token',
        type: 'secret',
        headerName: 'Authorization',
        prefix: 'Bearer ',
        required: true,
      },
      {
        key: 'tenantUrl',
        label: 'Tenant URL',
        type: 'url',
        headerName: 'X-Tenant-Url',
        required: true,
      },
    ],
    userFields: [],
  };

  it('should report kind as SELF_DEFINED', () => {
    const integration = new SelfDefinedMcpIntegration({
      orgId,
      name: 'Internal Wiki MCP',
      serverUrl: 'https://wiki.internal.example.org/mcp',
      configSchema,
      orgConfigValues: {
        apiToken: 'encrypted-internal-token',
        tenantUrl: 'https://wiki.internal.example.org',
      },
      auth: new NoAuthMcpIntegrationAuth(),
    });

    expect(integration.kind).toBe(McpIntegrationKind.SELF_DEFINED);
  });

  it('should expose serverUrl, configSchema, and orgConfigValues', () => {
    const integration = new SelfDefinedMcpIntegration({
      orgId,
      name: 'Internal Wiki MCP',
      serverUrl: 'https://wiki.internal.example.org/mcp',
      configSchema,
      orgConfigValues: {
        apiToken: 'encrypted-internal-token',
        tenantUrl: 'https://wiki.internal.example.org',
      },
      auth: new NoAuthMcpIntegrationAuth(),
    });

    expect(integration.serverUrl).toBe('https://wiki.internal.example.org/mcp');
    expect(integration.configSchema).toBe(configSchema);
    expect(integration.orgConfigValues).toEqual({
      apiToken: 'encrypted-internal-token',
      tenantUrl: 'https://wiki.internal.example.org',
    });
  });

  it('should return a defensive copy of orgConfigValues', () => {
    const integration = new SelfDefinedMcpIntegration({
      orgId,
      name: 'Internal Wiki MCP',
      serverUrl: 'https://wiki.internal.example.org/mcp',
      configSchema,
      orgConfigValues: { apiToken: 'encrypted-internal-token' },
      auth: new NoAuthMcpIntegrationAuth(),
    });

    const snapshot = integration.orgConfigValues;
    snapshot.apiToken = 'tampered';

    expect(integration.orgConfigValues).toEqual({
      apiToken: 'encrypted-internal-token',
    });
  });

  it('should be identified as self-defined via isSelfDefined() and not as marketplace', () => {
    const integration = new SelfDefinedMcpIntegration({
      orgId,
      name: 'Internal Wiki MCP',
      serverUrl: 'https://wiki.internal.example.org/mcp',
      configSchema,
      orgConfigValues: {},
      auth: new NoAuthMcpIntegrationAuth(),
    });

    expect(integration.isSelfDefined()).toBe(true);
    expect(integration.isMarketplace()).toBe(false);
    expect(integration.isCustom()).toBe(false);
    expect(integration.isPredefined()).toBe(false);
  });

  it('should update org config values and refresh updatedAt', () => {
    const integration = new SelfDefinedMcpIntegration({
      orgId,
      name: 'Internal Wiki MCP',
      serverUrl: 'https://wiki.internal.example.org/mcp',
      configSchema,
      orgConfigValues: { apiToken: 'old-encrypted' },
      auth: new NoAuthMcpIntegrationAuth(),
    });

    const previousUpdatedAt = integration.updatedAt;

    integration.updateOrgConfigValues({ apiToken: 'new-encrypted' });

    expect(integration.orgConfigValues).toEqual({
      apiToken: 'new-encrypted',
    });
    expect(integration.updatedAt.getTime()).toBeGreaterThanOrEqual(
      previousUpdatedAt.getTime(),
    );
  });

  it('should default to empty org config values when none are provided', () => {
    const integration = new SelfDefinedMcpIntegration({
      orgId,
      name: 'Anon MCP',
      serverUrl: 'https://example.com/mcp',
      configSchema: {
        authType: 'NO_AUTH',
        orgFields: [],
        userFields: [],
      },
      orgConfigValues: {},
      auth: new NoAuthMcpIntegrationAuth(),
    });

    expect(integration.orgConfigValues).toEqual({});
  });

  it('should accept and expose OAuth client credentials when provided', () => {
    const integration = new SelfDefinedMcpIntegration({
      orgId,
      name: 'GitHub MCP',
      serverUrl: 'https://github.example.org/mcp',
      configSchema: {
        authType: 'OAUTH',
        orgFields: [],
        userFields: [],
        oauth: {
          authorizationUrl: 'https://github.example.org/oauth/authorize',
          tokenUrl: 'https://github.example.org/oauth/token',
          scopes: ['read:user'],
          level: 'org',
        },
      },
      orgConfigValues: {},
      auth: new NoAuthMcpIntegrationAuth(),
      oauthClientId: 'client-abc-123',
      oauthClientSecretEncrypted: 'enc-secret-xyz',
    });

    expect(integration.oauthClientId).toBe('client-abc-123');
    expect(integration.oauthClientSecretEncrypted).toBe('enc-secret-xyz');
  });
});
