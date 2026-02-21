import { randomUUID } from 'crypto';
import { McpIntegrationDtoMapper } from './mcp-integration-dto.mapper';
import { CustomMcpIntegration } from '../../../domain/integrations/custom-mcp-integration.entity';
import { PredefinedMcpIntegration } from '../../../domain/integrations/predefined-mcp-integration.entity';
import { MarketplaceMcpIntegration } from '../../../domain/integrations/marketplace-mcp-integration.entity';
import { BearerMcpIntegrationAuth } from '../../../domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from '../../../domain/auth/custom-header-mcp-integration-auth.entity';
import { NoAuthMcpIntegrationAuth } from '../../../domain/auth/no-auth-mcp-integration-auth.entity';
import { PredefinedMcpIntegrationSlug } from '../../../domain/value-objects/predefined-mcp-integration-slug.enum';
import type { IntegrationConfigSchema } from '../../../domain/value-objects/integration-config-schema';
import { SECRET_MASK } from '../../../domain/value-objects/secret-mask.constant';

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

  it('maps marketplace integration with config schema and identifier', () => {
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
      userFields: [
        {
          key: 'personalToken',
          label: 'Personal Token',
          type: 'secret',
          headerName: 'Authorization',
          prefix: 'Bearer ',
          required: false,
        },
      ],
    };
    const integration = new MarketplaceMcpIntegration({
      ...baseParams,
      marketplaceIdentifier: 'oparl-council-data',
      configSchema,
      orgConfigValues: { apiToken: 'encrypted-value' },
      auth: new NoAuthMcpIntegrationAuth(),
    });

    const dto = mapper.toDto(integration);

    expect(dto.type).toBe('marketplace');
    expect(dto.marketplaceIdentifier).toBe('oparl-council-data');
    expect(dto.configSchema).toEqual({
      authType: 'BEARER_TOKEN',
      orgFields: configSchema.orgFields,
      userFields: configSchema.userFields,
    });
    expect(dto.hasUserFields).toBe(true);
    expect(dto.serverUrl).toBeUndefined();
    expect(dto.slug).toBeUndefined();
    // Secret field is masked
    expect(dto.orgConfigValues).toEqual({ apiToken: SECRET_MASK });
  });

  it('maps marketplace integration without user fields', () => {
    const configSchema: IntegrationConfigSchema = {
      authType: 'NO_AUTH',
      orgFields: [
        {
          key: 'endpointUrl',
          label: 'Endpoint URL',
          type: 'url',
          headerName: 'X-Endpoint-Url',
          required: true,
        },
      ],
      userFields: [],
    };
    const integration = new MarketplaceMcpIntegration({
      ...baseParams,
      marketplaceIdentifier: 'simple-integration',
      configSchema,
      orgConfigValues: { endpointUrl: 'https://example.com/api' },
      auth: new NoAuthMcpIntegrationAuth(),
    });

    const dto = mapper.toDto(integration);

    expect(dto.type).toBe('marketplace');
    expect(dto.hasUserFields).toBe(false);
  });

  it('exposes non-secret org config values as plaintext and masks secrets', () => {
    const configSchema: IntegrationConfigSchema = {
      authType: 'NO_AUTH',
      orgFields: [
        {
          key: 'endpointUrl',
          label: 'Endpoint URL',
          type: 'url',
          required: true,
        },
        {
          key: 'apiToken',
          label: 'API Token',
          type: 'secret',
          required: true,
        },
        {
          key: 'description',
          label: 'Description',
          type: 'text',
          required: false,
        },
      ],
      userFields: [],
    };
    const integration = new MarketplaceMcpIntegration({
      ...baseParams,
      marketplaceIdentifier: 'multi-field-integration',
      configSchema,
      orgConfigValues: {
        endpointUrl: 'https://rim.ekom21.de/oparl/v1',
        apiToken: 'encrypted:my-secret-token',
        description: 'Municipal council data',
      },
      auth: new NoAuthMcpIntegrationAuth(),
    });

    const dto = mapper.toDto(integration);

    expect(dto.orgConfigValues).toEqual({
      endpointUrl: 'https://rim.ekom21.de/oparl/v1',
      apiToken: SECRET_MASK,
      description: 'Municipal council data',
    });
  });

  it('excludes fixed-value fields from orgConfigValues', () => {
    const configSchema: IntegrationConfigSchema = {
      authType: 'BEARER_TOKEN',
      orgFields: [
        {
          key: 'systemToken',
          label: 'System Token',
          type: 'secret',
          required: true,
          value: 'sk-fixed-token',
        },
        {
          key: 'endpointUrl',
          label: 'Endpoint URL',
          type: 'url',
          required: true,
        },
      ],
      userFields: [],
    };
    const integration = new MarketplaceMcpIntegration({
      ...baseParams,
      marketplaceIdentifier: 'fixed-field-integration',
      configSchema,
      orgConfigValues: {
        systemToken: 'encrypted:sk-fixed-token',
        endpointUrl: 'https://example.com/api',
      },
      auth: new NoAuthMcpIntegrationAuth(),
    });

    const dto = mapper.toDto(integration);

    // Fixed-value field should not appear in orgConfigValues
    expect(dto.orgConfigValues).toEqual({
      endpointUrl: 'https://example.com/api',
    });
    expect(dto.orgConfigValues!.systemToken).toBeUndefined();
  });
});
