import { randomUUID } from 'crypto';
import {
  BearerMcpIntegrationAuthRecord,
  CustomHeaderMcpIntegrationAuthRecord,
  CustomMcpIntegrationRecord,
  McpIntegrationAuthRecord,
  McpIntegrationRecord,
  NoAuthMcpIntegrationAuthRecord,
  OAuthMcpIntegrationAuthRecord,
  PredefinedMcpIntegrationRecord,
} from './index';

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
    expect(record.predefinedSlug).toBeUndefined();
  });

  it('should instantiate predefined integration record and require slug', () => {
    const record = new PredefinedMcpIntegrationRecord();
    record.id = randomUUID();
    record.orgId = randomUUID();
    record.name = 'Predefined';
    record.serverUrl = 'https://registry.example.com/mcp';
    record.predefinedSlug = 'TEST';

    expect(record).toBeInstanceOf(PredefinedMcpIntegrationRecord);
    expect(record.predefinedSlug).toBe('TEST');
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
});
