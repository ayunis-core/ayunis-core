import { randomUUID } from 'crypto';
import { McpIntegrationMapper } from './mcp-integration.mapper';
import { CustomMcpIntegration } from '../../../../domain/integrations/custom-mcp-integration.entity';
import { PredefinedMcpIntegration } from '../../../../domain/integrations/predefined-mcp-integration.entity';
import { McpIntegrationKind } from '../../../../domain/value-objects/mcp-integration-kind.enum';
import { PredefinedMcpIntegrationSlug } from '../../../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { NoAuthMcpIntegrationAuth } from '../../../../domain/auth/no-auth-mcp-integration-auth.entity';
import { BearerMcpIntegrationAuth } from '../../../../domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from '../../../../domain/auth/custom-header-mcp-integration-auth.entity';
import { OAuthMcpIntegrationAuth } from '../../../../domain/auth/oauth-mcp-integration-auth.entity';
import {
  BearerMcpIntegrationAuthRecord,
  CustomHeaderMcpIntegrationAuthRecord,
  CustomMcpIntegrationRecord,
  McpIntegrationAuthRecord,
  McpIntegrationRecord,
  NoAuthMcpIntegrationAuthRecord,
  OAuthMcpIntegrationAuthRecord,
  PredefinedMcpIntegrationRecord,
} from '../schema';

describe('McpIntegrationMapper', () => {
  let mapper: McpIntegrationMapper;

  beforeEach(() => {
    mapper = new McpIntegrationMapper();
  });

  const baseParams = {
    orgId: 'org-123',
    name: 'Test Integration',
    serverUrl: 'https://example.com/mcp',
    enabled: true,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    connectionStatus: 'pending',
  } as const;

  describe('toRecord', () => {
    it('maps custom integration with no auth', () => {
      const auth = new NoAuthMcpIntegrationAuth();
      const integration = new CustomMcpIntegration({
        ...baseParams,
        auth,
      });

      const record = mapper.toRecord(integration);

      expect(record).toBeInstanceOf(CustomMcpIntegrationRecord);
      expect(record.orgId).toBe(baseParams.orgId);
      expect(record.auth).toBeInstanceOf(NoAuthMcpIntegrationAuthRecord);
      expect((record.auth as McpIntegrationAuthRecord).integrationId).toBe(
        record.id,
      );
    });

    it('maps predefined integration with bearer auth and slug', () => {
      const auth = new BearerMcpIntegrationAuth({
        authToken: 'encrypted-token',
      });
      const integration = new PredefinedMcpIntegration({
        ...baseParams,
        auth,
        slug: PredefinedMcpIntegrationSlug.TEST,
      });

      const record = mapper.toRecord(integration);

      expect(record).toBeInstanceOf(PredefinedMcpIntegrationRecord);
      expect(record.predefinedSlug).toBe(PredefinedMcpIntegrationSlug.TEST);
      expect(record.auth).toBeInstanceOf(BearerMcpIntegrationAuthRecord);
      expect((record.auth as BearerMcpIntegrationAuthRecord).authToken).toBe(
        'encrypted-token',
      );
    });

    it('maps custom integration with custom header auth', () => {
      const auth = new CustomHeaderMcpIntegrationAuth({
        secret: 'encrypted-secret',
        headerName: 'X-API-Key',
      });
      const integration = new CustomMcpIntegration({
        ...baseParams,
        auth,
      });

      const record = mapper.toRecord(integration);

      expect(record.auth).toBeInstanceOf(CustomHeaderMcpIntegrationAuthRecord);
      expect(
        (record.auth as CustomHeaderMcpIntegrationAuthRecord).headerName,
      ).toBe('X-API-Key');
    });

    it('maps custom integration with oauth auth', () => {
      const expiresAt = new Date('2025-01-02T00:00:00.000Z');
      const auth = new OAuthMcpIntegrationAuth({
        clientId: 'client',
        clientSecret: 'secret',
        accessToken: 'access',
        tokenExpiresAt: expiresAt,
      });
      const integration = new CustomMcpIntegration({
        ...baseParams,
        auth,
      });

      const record = mapper.toRecord(integration);

      expect(record.auth).toBeInstanceOf(OAuthMcpIntegrationAuthRecord);
      expect((record.auth as OAuthMcpIntegrationAuthRecord).clientId).toBe(
        'client',
      );
      expect(
        (record.auth as OAuthMcpIntegrationAuthRecord).tokenExpiresAt,
      ).toBe(expiresAt);
    });
  });

  describe('toDomain', () => {
    it('maps custom integration with no auth', () => {
      const record = new CustomMcpIntegrationRecord();
      record.id = randomUUID();
      record.orgId = baseParams.orgId;
      record.name = baseParams.name;
      record.serverUrl = baseParams.serverUrl;
      record.enabled = baseParams.enabled;
      record.connectionStatus = baseParams.connectionStatus;
      record.createdAt = baseParams.createdAt;
      record.updatedAt = baseParams.updatedAt;

      const authRecord = new NoAuthMcpIntegrationAuthRecord();
      authRecord.id = randomUUID();
      authRecord.integrationId = record.id;
      authRecord.createdAt = baseParams.createdAt;
      authRecord.updatedAt = baseParams.updatedAt;
      authRecord.integration = record;
      record.auth = authRecord;

      const domain = mapper.toDomain(record);

      expect(domain).toBeInstanceOf(CustomMcpIntegration);
      expect(domain.kind).toBe(McpIntegrationKind.CUSTOM);
      expect(domain.auth).toBeInstanceOf(NoAuthMcpIntegrationAuth);
    });

    it('maps predefined integration with bearer auth', () => {
      const record = new PredefinedMcpIntegrationRecord();
      record.id = randomUUID();
      record.orgId = baseParams.orgId;
      record.name = baseParams.name;
      record.serverUrl = baseParams.serverUrl;
      record.predefinedSlug = PredefinedMcpIntegrationSlug.LOCABOO;
      record.enabled = baseParams.enabled;
      record.createdAt = baseParams.createdAt;
      record.updatedAt = baseParams.updatedAt;
      record.connectionStatus = 'connected';

      const authRecord = new BearerMcpIntegrationAuthRecord();
      authRecord.id = randomUUID();
      authRecord.integrationId = record.id;
      authRecord.authToken = 'encrypted';
      authRecord.integration = record;
      authRecord.createdAt = baseParams.createdAt;
      authRecord.updatedAt = baseParams.updatedAt;
      record.auth = authRecord;

      const domain = mapper.toDomain(record);

      expect(domain).toBeInstanceOf(PredefinedMcpIntegration);
      expect(domain.kind).toBe(McpIntegrationKind.PREDEFINED);
      expect(domain.auth).toBeInstanceOf(BearerMcpIntegrationAuth);
      expect((domain.auth as BearerMcpIntegrationAuth).authToken).toBe(
        'encrypted',
      );
    });

    it('maps custom integration with custom header auth', () => {
      const record = new CustomMcpIntegrationRecord();
      record.id = randomUUID();
      record.orgId = baseParams.orgId;
      record.name = baseParams.name;
      record.serverUrl = baseParams.serverUrl;
      record.enabled = baseParams.enabled;
      record.createdAt = baseParams.createdAt;
      record.updatedAt = baseParams.updatedAt;

      const authRecord = new CustomHeaderMcpIntegrationAuthRecord();
      authRecord.id = randomUUID();
      authRecord.integrationId = record.id;
      authRecord.secret = 'encrypted-secret';
      authRecord.headerName = 'X-API-Key';
      authRecord.integration = record;
      authRecord.createdAt = baseParams.createdAt;
      authRecord.updatedAt = baseParams.updatedAt;
      record.auth = authRecord;

      const domain = mapper.toDomain(record);

      expect(domain.auth).toBeInstanceOf(CustomHeaderMcpIntegrationAuth);
      expect((domain.auth as CustomHeaderMcpIntegrationAuth).secret).toBe(
        'encrypted-secret',
      );
    });
  });

  it('round-trips an integration through record mapping', () => {
    const auth = new CustomHeaderMcpIntegrationAuth({
      secret: 'encrypted-secret',
      headerName: 'X-API-Key',
    });
    const original = new CustomMcpIntegration({
      ...baseParams,
      auth,
    });

    const record = mapper.toRecord(original);
    const reconstructed = mapper.toDomain(record);

    expect(reconstructed.kind).toBe(McpIntegrationKind.CUSTOM);
    expect(
      (reconstructed.auth as CustomHeaderMcpIntegrationAuth).headerName,
    ).toBe('X-API-Key');
  });
});
