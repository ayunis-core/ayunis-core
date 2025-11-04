import { randomUUID } from 'crypto';
import { McpIntegrationDtoMapper } from './mcp-integration-dto.mapper';
import { CustomMcpIntegration } from '../../../domain/integrations/custom-mcp-integration.entity';
import { PredefinedMcpIntegration } from '../../../domain/integrations/predefined-mcp-integration.entity';
import { BearerMcpIntegrationAuth } from '../../../domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from '../../../domain/auth/custom-header-mcp-integration-auth.entity';
import { NoAuthMcpIntegrationAuth } from '../../../domain/auth/no-auth-mcp-integration-auth.entity';
import { McpIntegrationKind } from '../../../domain/value-objects/mcp-integration-kind.enum';
import { PredefinedMcpIntegrationSlug } from '../../../domain/value-objects/predefined-mcp-integration-slug.enum';

describe('McpIntegrationDtoMapper', () => {
  const mapper = new McpIntegrationDtoMapper();
  const baseParams = {
    id: randomUUID(),
    orgId: randomUUID(),
    name: 'Integration',
    serverUrl: 'https://example.com/mcp',
    enabled: true,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    connectionStatus: 'connected',
  } as const;

  it('maps custom integration with custom header auth', () => {
    const auth = new CustomHeaderMcpIntegrationAuth({
      secret: 'encrypted-secret',
      headerName: 'X-API-Key',
    });
    const integration = new CustomMcpIntegration({
      ...baseParams,
      auth,
    });

    const dto = mapper.toDto(integration);

    expect(dto.type).toBe('custom');
    expect(dto.serverUrl).toBe(baseParams.serverUrl);
    expect(dto.authMethod).toBe(auth.getMethod());
    expect(dto.authHeaderName).toBe('X-API-Key');
    expect(dto.hasCredentials).toBe(true);
  });

  it('maps predefined integration with bearer auth', () => {
    const auth = new BearerMcpIntegrationAuth({ authToken: 'encrypted' });
    const integration = new PredefinedMcpIntegration({
      ...baseParams,
      slug: PredefinedMcpIntegrationSlug.TEST,
      serverUrl: 'https://registry.example.com/mcp',
      auth,
    });

    const dto = mapper.toDto(integration);

    expect(dto.type).toBe('predefined');
    expect(dto.slug).toBe(PredefinedMcpIntegrationSlug.TEST);
    expect(dto.serverUrl).toBeUndefined();
    expect(dto.authHeaderName).toBe('Authorization');
  });

  it('maps no-auth integrations without credentials', () => {
    const integration = new CustomMcpIntegration({
      ...baseParams,
      auth: new NoAuthMcpIntegrationAuth(),
    });

    const dto = mapper.toDto(integration);

    expect(dto.hasCredentials).toBe(false);
    expect(dto.authHeaderName).toBeUndefined();
  });
});
