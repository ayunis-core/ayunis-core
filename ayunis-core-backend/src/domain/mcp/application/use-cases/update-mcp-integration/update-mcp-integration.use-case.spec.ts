import { UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UpdateMcpIntegrationUseCase } from './update-mcp-integration.use-case';
import { UpdateMcpIntegrationCommand } from './update-mcp-integration.command';
import type { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import type { ContextService } from 'src/common/context/services/context.service';
import type { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
import { MarketplaceConfigService } from '../../services/marketplace-config.service';
import { ValidateMcpIntegrationUseCase } from '../validate-mcp-integration/validate-mcp-integration.use-case';
import { CustomMcpIntegration } from '../../../domain/integrations/custom-mcp-integration.entity';
import { MarketplaceMcpIntegration } from '../../../domain/integrations/marketplace-mcp-integration.entity';
import { BearerMcpIntegrationAuth } from '../../../domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from '../../../domain/auth/custom-header-mcp-integration-auth.entity';
import { NoAuthMcpIntegrationAuth } from '../../../domain/auth/no-auth-mcp-integration-auth.entity';
import {
  McpNotMarketplaceIntegrationError,
  McpMissingRequiredConfigError,
} from '../../mcp.errors';
import { IntegrationConfigSchema } from '../../../domain/value-objects/integration-config-schema';

describe('UpdateMcpIntegrationUseCase', () => {
  const orgId = randomUUID();
  const integrationId = randomUUID();

  let repository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let context: jest.Mocked<ContextService>;
  let encryption: jest.Mocked<McpCredentialEncryptionPort>;
  let marketplaceConfigService: MarketplaceConfigService;
  let validateUseCase: jest.Mocked<ValidateMcpIntegrationUseCase>;
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

    context = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;

    encryption = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    } as unknown as jest.Mocked<McpCredentialEncryptionPort>;

    validateUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ValidateMcpIntegrationUseCase>;

    marketplaceConfigService = new MarketplaceConfigService(encryption);

    useCase = new UpdateMcpIntegrationUseCase(
      repository,
      context,
      encryption,
      marketplaceConfigService,
      validateUseCase,
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
    const integration = new CustomMcpIntegration({
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
  });

  it('updates custom header name without encrypting when only header changes', async () => {
    const auth = new CustomHeaderMcpIntegrationAuth({
      secret: 'encrypted-existing',
      headerName: 'X-OLD',
    });
    const integration = new CustomMcpIntegration({
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

    it('rejects orgConfigValues for non-marketplace integrations', async () => {
      const integration = new CustomMcpIntegration({
        id: integrationId,
        orgId,
        name: 'Custom Integration',
        serverUrl: 'https://example.com/mcp',
        auth: new NoAuthMcpIntegrationAuth(),
      });
      repository.findById.mockResolvedValue(integration);

      const command = new UpdateMcpIntegrationCommand({
        integrationId,
        orgConfigValues: { someField: 'value' },
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        McpNotMarketplaceIntegrationError,
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
