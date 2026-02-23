import { randomUUID } from 'crypto';
import {
  BearerMcpIntegrationAuthRecord,
  CustomHeaderMcpIntegrationAuthRecord,
  CustomMcpIntegrationRecord,
  MarketplaceMcpIntegrationRecord,
  McpIntegrationAuthRecord,
  McpIntegrationRecord,
  McpIntegrationUserConfigRecord,
  NoAuthMcpIntegrationAuthRecord,
  OAuthMcpIntegrationAuthRecord,
  PredefinedMcpIntegrationRecord,
} from './index';
import { PredefinedMcpIntegrationSlug } from '../../../../domain/value-objects/predefined-mcp-integration-slug.enum';
import type { IntegrationConfigSchema } from '../../../../domain/value-objects/integration-config-schema';

describe('MCP Integration Persistence Records', () => {
  it('should instantiate custom integration record with base fields', () => {
    const record = new CustomMcpIntegrationRecord();
    record.id = randomUUID();
    record.orgId = randomUUID();
    record.name = 'Custom';
    record.serverUrl = 'https://example.com/mcp';
    record.enabled = true;

    expect(record).toBeInstanceOf(CustomMcpIntegrationRecord);
    expect(record).toBeInstanceOf(McpIntegrationRecord);
  });

  it('should instantiate predefined integration record and require slug', () => {
    const record = new PredefinedMcpIntegrationRecord();
    record.id = randomUUID();
    record.orgId = randomUUID();
    record.name = 'Predefined';
    record.serverUrl = 'https://registry.example.com/mcp';
    record.predefinedSlug = PredefinedMcpIntegrationSlug.TEST;

    expect(record).toBeInstanceOf(PredefinedMcpIntegrationRecord);
    expect(record.predefinedSlug).toBe(PredefinedMcpIntegrationSlug.TEST);
  });

  it('should model one-to-one auth association via integrationId', () => {
    const integration = new CustomMcpIntegrationRecord();
    integration.id = randomUUID();
    integration.orgId = randomUUID();
    integration.name = 'With Auth';
    integration.serverUrl = 'https://example.com/mcp';

    const auth = new BearerMcpIntegrationAuthRecord();
    auth.integrationId = integration.id;
    integration.auth = auth;
    auth.integration = integration;

    expect(integration.auth).toBe(auth);
    expect(auth.integration).toBe(integration);
  });

  it('should instantiate no-auth auth record', () => {
    const auth = new NoAuthMcpIntegrationAuthRecord();
    auth.id = randomUUID();
    auth.integrationId = randomUUID();

    expect(auth).toBeInstanceOf(NoAuthMcpIntegrationAuthRecord);
    expect(auth).toBeInstanceOf(McpIntegrationAuthRecord);
  });

  it('should instantiate bearer auth record with optional token', () => {
    const auth = new BearerMcpIntegrationAuthRecord();
    auth.id = randomUUID();
    auth.integrationId = randomUUID();
    auth.authToken = 'encrypted-token';

    expect(auth.authToken).toBe('encrypted-token');
  });

  it('should instantiate custom header auth record with defaults', () => {
    const auth = new CustomHeaderMcpIntegrationAuthRecord();
    auth.id = randomUUID();
    auth.integrationId = randomUUID();

    expect(auth.secret).toBeUndefined();
    expect(auth.headerName).toBe('X-API-Key');
  });

  it('should instantiate oauth auth record with nullable fields', () => {
    const auth = new OAuthMcpIntegrationAuthRecord();
    auth.id = randomUUID();
    auth.integrationId = randomUUID();
    auth.clientId = 'client';
    auth.clientSecret = 'secret';
    auth.accessToken = 'access';
    auth.tokenExpiresAt = new Date();

    expect(auth.clientId).toBe('client');
    expect(auth.accessToken).toBe('access');
  });

  it('should instantiate marketplace integration record with config schema and org config values', () => {
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
      ],
      userFields: [],
    };

    const record = new MarketplaceMcpIntegrationRecord();
    record.id = randomUUID();
    record.orgId = randomUUID();
    record.name = 'OParl Integration';
    record.serverUrl = 'https://mcp.ayunis.de/oparl';
    record.marketplaceIdentifier = 'oparl-mcp';
    record.configSchema = configSchema;
    record.orgConfigValues = { apiToken: 'encrypted-token-value' };
    record.enabled = true;

    expect(record).toBeInstanceOf(MarketplaceMcpIntegrationRecord);
    expect(record).toBeInstanceOf(McpIntegrationRecord);
    expect(record.marketplaceIdentifier).toBe('oparl-mcp');
    expect(record.configSchema.authType).toBe('BEARER_TOKEN');
    expect(record.configSchema.orgFields).toHaveLength(1);
    expect(record.orgConfigValues).toEqual({
      apiToken: 'encrypted-token-value',
    });
  });

  it('should instantiate user config record with integration and user references', () => {
    const record = new McpIntegrationUserConfigRecord();
    record.id = randomUUID();
    record.integrationId = randomUUID();
    record.userId = randomUUID();
    record.configValues = { personalToken: 'encrypted-user-token' };

    expect(record).toBeInstanceOf(McpIntegrationUserConfigRecord);
    expect(record.integrationId).toBeDefined();
    expect(record.userId).toBeDefined();
    expect(record.configValues).toEqual({
      personalToken: 'encrypted-user-token',
    });
  });
});
