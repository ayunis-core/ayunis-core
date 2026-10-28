import { UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UpdateMcpIntegrationUseCase } from './update-mcp-integration.use-case';
import { UpdateMcpIntegrationCommand } from './update-mcp-integration.command';
import type { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import type { McpIntegrationUserConfigRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integration-user-config.repository.port';
import type { ContextService } from 'src/common/context/services/context.service';
import type { McpCredentialEncryptionPort } from 'src/domain/mcp/application/ports/mcp-credential-encryption.port';
import { McpConfigService } from 'src/domain/mcp/application/services/mcp-config.service';
import { ConnectionValidationService } from 'src/domain/mcp/application/services/connection-validation.service';
import { McpCapabilityCacheService } from 'src/domain/mcp/application/services/mcp-capability-cache.service';
import type { McpClientService } from 'src/domain/mcp/application/services/mcp-client.service';
import type { ValidateMcpIntegrationUseCase } from 'src/domain/mcp/application/use-cases/validate-mcp-integration/validate-mcp-integration.use-case';
import { aCustomMcpIntegration } from 'src/domain/mcp/application/testing/mcp-integration.fixtures';
import { PredefinedMcpIntegration } from 'src/domain/mcp/domain/integrations/predefined-mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from 'src/domain/mcp/domain/value-objects/predefined-mcp-integration-slug.enum';
import { MarketplaceMcpIntegration } from 'src/domain/mcp/domain/integrations/marketplace-mcp-integration.entity';
import { BearerMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/custom-header-mcp-integration-auth.entity';
import { NoAuthMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/no-auth-mcp-integration-auth.entity';
import {
  McpIntegrationNotConfigurableError,
  McpMissingRequiredConfigError,
  McpValidationFailedError,
} from 'src/domain/mcp/application/mcp.errors';
import type { IntegrationConfigSchema } from 'src/domain/mcp/domain/value-objects/integration-config-schema';
import type { SchemaConfiguredMcpIntegration } from 'src/domain/mcp/domain/integrations/schema-configured-mcp-integration.entity';

describe('UpdateMcpIntegrationUseCase', () => {
  const orgId = randomUUID();
  const integrationId = randomUUID();

  let repository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let userConfigRepository: jest.Mocked<McpIntegrationUserConfigRepositoryPort>;
  let context: jest.Mocked<ContextService>;
  let encryption: jest.Mocked<McpCredentialEncryptionPort>;
  let configService: McpConfigService;
  let validateUseCase: jest.Mocked<ValidateMcpIntegrationUseCase>;
  let connectionValidationService: ConnectionValidationService;
  let capabilityCache: McpCapabilityCacheService;
  let mcpClientService: jest.Mocked<
    Pick<McpClientService, 'invalidateConnections'>
  >;
  let useCase: UpdateMcpIntegrationUseCase;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn(),
      findByOrgIdAndSlug: jest.fn(),
      findByOrgIdAndMarketplaceIdentifier: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<McpIntegrationsRepositoryPort>;

    userConfigRepository = {
      removeKeysByIntegrationId: jest.fn(),
    } as unknown as jest.Mocked<McpIntegrationUserConfigRepositoryPort>;

    context = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;

    encryption = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    };

    validateUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ValidateMcpIntegrationUseCase>;

    configService = new McpConfigService(encryption);
    connectionValidationService = new ConnectionValidationService(
      validateUseCase,
      repository,
    );

    capabilityCache = new McpCapabilityCacheService();
    mcpClientService = { invalidateConnections: jest.fn() };

    useCase = new UpdateMcpIntegrationUseCase(
      repository,
      userConfigRepository,
      context,
      encryption,
      configService,
      connectionValidationService,
      capabilityCache,
      { initialize: jest.fn() } as never,
      mcpClientService as unknown as McpClientService,
    );
    context.get.mockReturnValue(orgId);
    repository.save.mockImplementation(async (integration) => integration);
    encryption.encrypt.mockImplementation(
      async (plaintext) => `encrypted:${plaintext}`,
    );
    validateUseCase.execute.mockResolvedValue({
      isValid: true,
      toolCount: 3,
      resourceCount: 0,
      promptCount: 0,
    });
  });

  it('updates name and rotates bearer token credentials', async () => {
    const auth = new BearerMcpIntegrationAuth({ authToken: 'encrypted-old' });
    const integration = aCustomMcpIntegration({
      id: integrationId,
      orgId,
      name: 'Old Name',
      serverUrl: 'https://example.com/mcp',
      auth,
    });

    repository.findById.mockResolvedValue(integration);
    encryption.encrypt.mockResolvedValue('encrypted-new');

    const command = new UpdateMcpIntegrationCommand({
      integrationId,
      name: 'New Name',
      credentials: 'new-token',
    });

    const result = await useCase.execute(command);

    expect(encryption.encrypt).toHaveBeenCalledWith('new-token');
    expect(result.name).toBe('New Name');
    expect((result.auth as BearerMcpIntegrationAuth).authToken).toBe(
      'encrypted-new',
    );
    expect(repository.save).toHaveBeenCalledWith(integration);
    expect(mcpClientService.invalidateConnections).toHaveBeenCalledWith(
      integration,
    );
  });

  it('rejects OAuth client updates before mutating a non-schema integration', async () => {
    const integration = new PredefinedMcpIntegration({
      id: integrationId,
      orgId,
      name: 'Original name',
      serverUrl: 'https://example.com/mcp',
      slug: PredefinedMcpIntegrationSlug.TEST,
      auth: new NoAuthMcpIntegrationAuth(),
    });
    repository.findById.mockResolvedValue(integration);

    await expect(
      useCase.execute(
        new UpdateMcpIntegrationCommand({
          integrationId,
          name: 'Partially updated name',
          oauthClient: { clientId: 'invalid-for-this-integration' },
        }),
      ),
    ).rejects.toThrow(McpIntegrationNotConfigurableError);
    expect(integration.name).toBe('Original name');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('invalidates cached capabilities after an update', async () => {
    const integration = aCustomMcpIntegration({
      id: integrationId,
      orgId,
      name: 'Old Name',
      serverUrl: 'https://example.com/mcp',
      auth: new NoAuthMcpIntegrationAuth(),
    });
    repository.findById.mockResolvedValue(integration);

    const loader = jest.fn().mockResolvedValue({
      tools: [],
      resources: [],
      resourceTemplates: [],
      prompts: [],
    });
    await capabilityCache.getOrLoad(integrationId, undefined, loader);

    await useCase.execute(
      new UpdateMcpIntegrationCommand({ integrationId, name: 'New Name' }),
    );

    await capabilityCache.getOrLoad(integrationId, undefined, loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('updates custom header name without encrypting when only header changes', async () => {
    const auth = new CustomHeaderMcpIntegrationAuth({
      secret: 'encrypted-existing',
      headerName: 'X-OLD',
    });
    const integration = aCustomMcpIntegration({
      id: integrationId,
      orgId,
      name: 'With Header',
      serverUrl: 'https://example.com/mcp',
      auth,
    });

    repository.findById.mockResolvedValue(integration);

    const command = new UpdateMcpIntegrationCommand({
      integrationId,
      authHeaderName: 'X-NEW-KEY',
    });

    const result = await useCase.execute(command);

    expect(encryption.encrypt).not.toHaveBeenCalled();
    expect(
      (result.auth as CustomHeaderMcpIntegrationAuth).getAuthHeaderName(),
    ).toBe('X-NEW-KEY');
    expect(repository.save).toHaveBeenCalledWith(integration);
  });

  it('updates a custom integration server URL and revalidates the connection', async () => {
    const integration = aCustomMcpIntegration({
      id: integrationId,
      orgId,
      name: 'Document archive',
      serverUrl: 'https://old.example.com/mcp',
      auth: new NoAuthMcpIntegrationAuth(),
    });
    repository.findById.mockResolvedValue(integration);

    const result = await useCase.execute(
      new UpdateMcpIntegrationCommand({
        integrationId,
        serverUrl: 'https://new.example.com/mcp',
      }),
    );

    expect(result.serverUrl).toBe('https://new.example.com/mcp');
    expect(validateUseCase.execute).toHaveBeenCalledWith({ integrationId });
    expect(repository.save).toHaveBeenCalledTimes(2);
  });

  it('updates custom header definitions while preserving an omitted secret', async () => {
    const integration = aCustomMcpIntegration({
      id: integrationId,
      orgId,
      name: 'Document archive',
      serverUrl: 'https://documents.example.com/mcp',
      auth: new NoAuthMcpIntegrationAuth(),
      configSchema: {
        authType: 'CUSTOM',
        orgFields: [
          {
            key: 'apiToken',
            label: 'API token',
            type: 'secret',
            headerName: 'X-Old-Token',
            required: true,
          },
        ],
        userFields: [],
      },
      orgConfigValues: { apiToken: 'encrypted:existing-token' },
    });
    repository.findById.mockResolvedValue(integration);

    const result = await useCase.execute(
      new UpdateMcpIntegrationCommand({
        integrationId,
        configSchema: {
          authType: 'CUSTOM',
          orgFields: [
            {
              key: 'apiToken',
              label: 'API token',
              type: 'secret',
              headerName: 'Authorization',
              prefix: 'Bearer ',
              required: true,
            },
          ],
          userFields: [],
        },
        orgConfigValues: {},
      }),
    );

    expect(
      (result as SchemaConfiguredMcpIntegration).configSchema.orgFields[0],
    ).toEqual(
      expect.objectContaining({
        headerName: 'Authorization',
        prefix: 'Bearer ',
      }),
    );
    expect(
      (result as SchemaConfiguredMcpIntegration).orgConfigValues.apiToken,
    ).toBe('encrypted:existing-token');
    expect(encryption.encrypt).not.toHaveBeenCalled();
    expect(validateUseCase.execute).toHaveBeenCalledWith({ integrationId });
  });

  it('rejects changing the type of an existing configuration field', async () => {
    const integration = aCustomMcpIntegration({
      id: integrationId,
      orgId,
      name: 'Document archive',
      serverUrl: 'https://documents.example.com/mcp',
      auth: new NoAuthMcpIntegrationAuth(),
      configSchema: {
        authType: 'CUSTOM',
        orgFields: [
          {
            key: 'apiToken',
            label: 'API token',
            type: 'secret',
            headerName: 'Authorization',
            required: true,
          },
        ],
        userFields: [],
      },
      orgConfigValues: { apiToken: 'encrypted:existing-token' },
    });
    repository.findById.mockResolvedValue(integration);

    await expect(
      useCase.execute(
        new UpdateMcpIntegrationCommand({
          integrationId,
          name: 'Partially changed name',
          configSchema: {
            authType: 'CUSTOM',
            orgFields: [
              {
                key: 'apiToken',
                label: 'API token',
                type: 'text',
                headerName: 'Authorization',
                required: true,
              },
            ],
            userFields: [],
          },
        }),
      ),
    ).rejects.toThrow(McpValidationFailedError);
    expect(integration.name).toBe('Document archive');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects moving an existing configuration field to another scope', async () => {
    const integration = aCustomMcpIntegration({
      id: integrationId,
      orgId,
      name: 'Document archive',
      serverUrl: 'https://documents.example.com/mcp',
      auth: new NoAuthMcpIntegrationAuth(),
      configSchema: {
        authType: 'CUSTOM',
        orgFields: [
          {
            key: 'tenant',
            label: 'Tenant',
            type: 'text',
            headerName: 'X-Tenant',
            required: true,
          },
        ],
        userFields: [],
      },
      orgConfigValues: { tenant: 'council-42' },
    });
    repository.findById.mockResolvedValue(integration);

    await expect(
      useCase.execute(
        new UpdateMcpIntegrationCommand({
          integrationId,
          configSchema: {
            authType: 'CUSTOM',
            orgFields: [],
            userFields: [
              {
                key: 'tenant',
                label: 'Tenant',
                type: 'text',
                headerName: 'X-Tenant',
                required: true,
              },
            ],
          },
        }),
      ),
    ).rejects.toThrow(McpValidationFailedError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('does not centrally validate integrations requiring user configuration', async () => {
    const integration = aCustomMcpIntegration({
      id: integrationId,
      orgId,
      name: 'User-scoped archive',
      serverUrl: 'https://documents.example.com/mcp',
      auth: new NoAuthMcpIntegrationAuth(),
      configSchema: {
        authType: 'CUSTOM',
        orgFields: [],
        userFields: [
          {
            key: 'apiToken',
            label: 'API token',
            type: 'secret',
            headerName: 'Authorization',
            required: true,
          },
        ],
      },
    });
    repository.findById.mockResolvedValue(integration);

    await useCase.execute(
      new UpdateMcpIntegrationCommand({
        integrationId,
        serverUrl: 'https://new-documents.example.com/mcp',
      }),
    );

    expect(validateUseCase.execute).not.toHaveBeenCalled();
  });

  it('removes deleted user field values from every user config', async () => {
    const integration = aCustomMcpIntegration({
      id: integrationId,
      orgId,
      configSchema: {
        authType: 'CUSTOM',
        orgFields: [],
        userFields: [
          {
            key: 'personalToken',
            label: 'Personal token',
            type: 'secret',
            headerName: 'Authorization',
            required: true,
          },
          {
            key: 'region',
            label: 'Region',
            type: 'text',
            headerName: 'X-Region',
            required: false,
          },
        ],
      },
    });
    repository.findById.mockResolvedValue(integration);

    await useCase.execute(
      new UpdateMcpIntegrationCommand({
        integrationId,
        configSchema: {
          authType: 'CUSTOM',
          orgFields: [],
          userFields: [
            {
              key: 'region',
              label: 'Region',
              type: 'text',
              headerName: 'X-Region',
              required: false,
            },
          ],
        },
      }),
    );

    expect(userConfigRepository.removeKeysByIntegrationId).toHaveBeenCalledWith(
      integrationId,
      ['personalToken'],
    );
  });

  it('preserves OAuth authType when an update schema omits it', async () => {
    const integration = aCustomMcpIntegration({
      id: integrationId,
      orgId,
      configSchema: {
        authType: 'OAUTH',
        orgFields: [],
        userFields: [],
        oauth: { clientRegistration: 'automatic', scopes: [] },
      },
    });
    repository.findById.mockResolvedValue(integration);

    await useCase.execute(
      new UpdateMcpIntegrationCommand({
        integrationId,
        configSchema: {
          orgFields: [],
          userFields: [],
          oauth: { clientRegistration: 'automatic', scopes: [] },
        },
      }),
    );

    expect(integration.configSchema.authType).toBe('OAUTH');
  });

  it('throws when user is not authenticated', async () => {
    context.get.mockReturnValueOnce(undefined);

    await expect(
      useCase.execute(new UpdateMcpIntegrationCommand({ integrationId })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  describe('marketplace orgConfigValues', () => {
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

    function createMarketplaceIntegration(
      overrides: Partial<{
        orgConfigValues: Record<string, string>;
      }> = {},
    ): MarketplaceMcpIntegration {
      return new MarketplaceMcpIntegration({
        id: integrationId,
        orgId,
        name: 'OParl Council Data',
        serverUrl: 'https://mcp.ayunis.de/oparl',
        marketplaceIdentifier: 'oparl-council-data',
        configSchema,
        orgConfigValues: overrides.orgConfigValues ?? {
          endpointUrl: 'https://rim.ekom21.de/oparl/v1',
          apiToken: 'encrypted:old-api-token',
        },
        auth: new NoAuthMcpIntegrationAuth(),
      });
    }

    it('updates non-secret orgConfigValues for a marketplace integration', async () => {
      const integration = createMarketplaceIntegration();
      repository.findById.mockResolvedValue(integration);

      const command = new UpdateMcpIntegrationCommand({
        integrationId,
        orgConfigValues: { endpointUrl: 'https://new-endpoint.de/oparl/v1' },
      });

      const result = await useCase.execute(command);

      const marketplace = result as MarketplaceMcpIntegration;
      expect(marketplace.orgConfigValues.endpointUrl).toBe(
        'https://new-endpoint.de/oparl/v1',
      );
    });

    it('updates OAuth org fields without probing an unauthenticated connection', async () => {
      const integration = new MarketplaceMcpIntegration({
        id: integrationId,
        orgId,
        name: 'OAuth integration',
        serverUrl: 'https://mcp.example.com',
        marketplaceIdentifier: 'oauth-integration',
        configSchema: {
          authType: 'OAUTH',
          orgFields: [
            {
              key: 'tenant',
              label: 'Tenant',
              type: 'text',
              headerName: 'X-Tenant',
              required: true,
            },
          ],
          userFields: [],
          oauth: { clientRegistration: 'automatic' },
        },
        orgConfigValues: { tenant: 'old-tenant' },
        auth: new NoAuthMcpIntegrationAuth(),
      });
      repository.findById.mockResolvedValue(integration);

      const result = await useCase.execute(
        new UpdateMcpIntegrationCommand({
          integrationId,
          orgConfigValues: { tenant: 'new-tenant' },
        }),
      );

      expect((result as MarketplaceMcpIntegration).orgConfigValues.tenant).toBe(
        'new-tenant',
      );
      expect(validateUseCase.execute).not.toHaveBeenCalled();
    });

    it('invalidates cached capabilities before connection validation completes', async () => {
      const integration = createMarketplaceIntegration();
      repository.findById.mockResolvedValue(integration);

      const loader = jest.fn().mockResolvedValue({
        tools: [],
        resources: [],
        resourceTemplates: [],
        prompts: [],
      });
      await capabilityCache.getOrLoad(integrationId, undefined, loader);

      let resolveValidation!: (value: {
        isValid: boolean;
        toolCount: number;
        resourceCount: number;
        promptCount: number;
      }) => void;
      validateUseCase.execute.mockReturnValue(
        new Promise((resolve) => {
          resolveValidation = resolve;
        }),
      );

      const pending = useCase.execute(
        new UpdateMcpIntegrationCommand({
          integrationId,
          orgConfigValues: { endpointUrl: 'https://new-endpoint.de/oparl/v1' },
        }),
      );

      // Let execute progress up to the in-flight connection validation.
      await new Promise((resolve) => setImmediate(resolve));

      await capabilityCache.getOrLoad(integrationId, undefined, loader);
      expect(loader).toHaveBeenCalledTimes(2);

      resolveValidation({
        isValid: true,
        toolCount: 3,
        resourceCount: 0,
        promptCount: 0,
      });
      await pending;
    });

    it('retains existing encrypted value for omitted secret fields', async () => {
      const integration = createMarketplaceIntegration();
      repository.findById.mockResolvedValue(integration);

      const command = new UpdateMcpIntegrationCommand({
        integrationId,
        orgConfigValues: { endpointUrl: 'https://new-endpoint.de/oparl/v1' },
      });

      const result = await useCase.execute(command);

      const marketplace = result as MarketplaceMcpIntegration;
      expect(marketplace.orgConfigValues.apiToken).toBe(
        'encrypted:old-api-token',
      );
    });

    it('encrypts new value when secret field is provided', async () => {
      const integration = createMarketplaceIntegration();
      repository.findById.mockResolvedValue(integration);

      const command = new UpdateMcpIntegrationCommand({
        integrationId,
        orgConfigValues: {
          endpointUrl: 'https://rim.ekom21.de/oparl/v1',
          apiToken: 'new-secret-token',
        },
      });

      const result = await useCase.execute(command);

      const marketplace = result as MarketplaceMcpIntegration;
      expect(marketplace.orgConfigValues.apiToken).toBe(
        'encrypted:new-secret-token',
      );
      expect(encryption.encrypt).toHaveBeenCalledWith('new-secret-token');
    });

    it('rejects orgConfigValues for integrations without a schema', async () => {
      const integration = new PredefinedMcpIntegration({
        id: integrationId,
        orgId,
        name: 'Predefined Integration',
        serverUrl: 'https://example.com/mcp',
        slug: PredefinedMcpIntegrationSlug.TEST,
        auth: new NoAuthMcpIntegrationAuth(),
      });
      repository.findById.mockResolvedValue(integration);

      const command = new UpdateMcpIntegrationCommand({
        integrationId,
        orgConfigValues: { someField: 'value' },
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationNotConfigurableError,
      );
    });

    it('validates required fields are present after merge', async () => {
      const integration = createMarketplaceIntegration({
        orgConfigValues: { apiToken: 'encrypted:token' },
      });
      repository.findById.mockResolvedValue(integration);

      // endpointUrl is required but not in existing and not provided
      const command = new UpdateMcpIntegrationCommand({
        integrationId,
        orgConfigValues: {},
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        McpMissingRequiredConfigError,
      );
    });

    it('preserves fixed-value fields from schema', async () => {
      const schemaWithFixed: IntegrationConfigSchema = {
        authType: 'BEARER_TOKEN',
        orgFields: [
          {
            key: 'systemToken',
            label: 'System Token',
            type: 'secret',
            required: true,
            value: 'sk-fixed-system-token',
          },
          {
            key: 'endpointUrl',
            label: 'Endpoint',
            type: 'url',
            required: true,
          },
        ],
        userFields: [],
      };

      const integration = new MarketplaceMcpIntegration({
        id: integrationId,
        orgId,
        name: 'Fixed Value Integration',
        serverUrl: 'https://mcp.ayunis.de/fixed',
        marketplaceIdentifier: 'fixed-integration',
        configSchema: schemaWithFixed,
        orgConfigValues: {
          systemToken: 'encrypted:sk-fixed-system-token',
          endpointUrl: 'https://old.com',
        },
        auth: new NoAuthMcpIntegrationAuth(),
      });
      repository.findById.mockResolvedValue(integration);

      const command = new UpdateMcpIntegrationCommand({
        integrationId,
        orgConfigValues: {
          systemToken: 'user-override-attempt',
          endpointUrl: 'https://new.com',
        },
      });

      const result = await useCase.execute(command);

      const marketplace = result as MarketplaceMcpIntegration;
      // Fixed value should be re-encrypted from schema, not user override
      expect(marketplace.orgConfigValues.systemToken).toBe(
        'encrypted:sk-fixed-system-token',
      );
      expect(marketplace.orgConfigValues.endpointUrl).toBe('https://new.com');
    });

    it('triggers connection validation after org config update', async () => {
      const integration = createMarketplaceIntegration();
      repository.findById.mockResolvedValue(integration);

      const command = new UpdateMcpIntegrationCommand({
        integrationId,
        orgConfigValues: { endpointUrl: 'https://new-endpoint.de/oparl/v1' },
      });

      await useCase.execute(command);

      expect(validateUseCase.execute).toHaveBeenCalledWith({
        integrationId: integration.id,
      });
      // save called twice: once for update, once after validation
      expect(repository.save).toHaveBeenCalledTimes(2);
    });

    it('does not fail update when connection validation fails', async () => {
      const integration = createMarketplaceIntegration();
      repository.findById.mockResolvedValue(integration);
      validateUseCase.execute.mockRejectedValue(
        new Error('Connection refused'),
      );

      const command = new UpdateMcpIntegrationCommand({
        integrationId,
        orgConfigValues: { endpointUrl: 'https://new-endpoint.de/oparl/v1' },
      });

      // Should not throw even though validation failed
      const result = await useCase.execute(command);
      expect(result).toBeInstanceOf(MarketplaceMcpIntegration);
    });
  });
});
