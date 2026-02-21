import { SetUserMcpConfigUseCase } from './set-user-mcp-config.use-case';
import { SetUserMcpConfigCommand } from './set-user-mcp-config.command';
import type { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import type { McpIntegrationUserConfigRepositoryPort } from '../../ports/mcp-integration-user-config.repository.port';
import type { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
import type { ContextService } from 'src/common/context/services/context.service';
import { MarketplaceMcpIntegration } from '../../../domain/integrations/marketplace-mcp-integration.entity';
import { CustomMcpIntegration } from '../../../domain/integrations/custom-mcp-integration.entity';
import { McpIntegrationUserConfig } from '../../../domain/mcp-integration-user-config.entity';
import { NoAuthMcpIntegrationAuth } from '../../../domain/auth/no-auth-mcp-integration-auth.entity';
import {
  McpIntegrationNotFoundError,
  McpNotMarketplaceIntegrationError,
  McpNoUserFieldsError,
  McpIntegrationAccessDeniedError,
  McpInvalidConfigKeysError,
} from '../../mcp.errors';
import type { UUID } from 'crypto';

describe('SetUserMcpConfigUseCase', () => {
  let useCase: SetUserMcpConfigUseCase;
  let integrationRepository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let userConfigRepository: jest.Mocked<McpIntegrationUserConfigRepositoryPort>;
  let credentialEncryption: jest.Mocked<McpCredentialEncryptionPort>;
  let contextService: jest.Mocked<ContextService>;

  const userId = '770e8400-e29b-41d4-a716-446655440001' as UUID;
  const orgId = '660e8400-e29b-41d4-a716-446655440001' as UUID;
  const integrationId = '550e8400-e29b-41d4-a716-446655440000' as UUID;

  const createMarketplaceIntegration = (
    userFields: MarketplaceMcpIntegration['configSchema']['userFields'],
  ) =>
    new MarketplaceMcpIntegration({
      id: integrationId,
      orgId,
      name: 'Locaboo Booking',
      serverUrl: 'https://mcp.ayunis.de/locaboo',
      auth: new NoAuthMcpIntegrationAuth({}),
      marketplaceIdentifier: 'locaboo-booking',
      configSchema: {
        authType: 'BEARER_TOKEN',
        orgFields: [
          {
            key: 'orgToken',
            type: 'secret' as const,
            label: 'Default API Token',
            headerName: 'Authorization',
            prefix: 'Bearer ',
            required: true,
          },
        ],
        userFields,
      },
      orgConfigValues: { orgToken: 'encrypted:org-token' },
    });

  beforeEach(() => {
    integrationRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      findAll: jest.fn(),
      findByOrgIdAndSlug: jest.fn(),
      findByOrgIdAndMarketplaceIdentifier: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<McpIntegrationsRepositoryPort>;

    userConfigRepository = {
      save: jest.fn(),
      findByIntegrationAndUser: jest.fn(),
      deleteByIntegrationId: jest.fn(),
    } as jest.Mocked<McpIntegrationUserConfigRepositoryPort>;

    credentialEncryption = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    } as jest.Mocked<McpCredentialEncryptionPort>;

    contextService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;

    contextService.get.mockImplementation((key?: string | symbol) => {
      if (key === 'userId') return userId;
      if (key === 'orgId') return orgId;
      return undefined;
    });
    credentialEncryption.encrypt.mockImplementation(
      async (plaintext) => `encrypted:${plaintext}`,
    );
    userConfigRepository.save.mockImplementation(async (config) => config);
    userConfigRepository.findByIntegrationAndUser.mockResolvedValue(null);

    useCase = new SetUserMcpConfigUseCase(
      integrationRepository,
      userConfigRepository,
      credentialEncryption,
      contextService,
    );
  });

  it('should create a new user config and return masked result', async () => {
    const integration = createMarketplaceIntegration([
      {
        key: 'personalToken',
        type: 'secret' as const,
        label: 'Personal Access Token',
        headerName: 'Authorization',
        prefix: 'Bearer ',
        required: false,
      },
      {
        key: 'tenantId',
        type: 'text' as const,
        label: 'Tenant ID',
        headerName: 'X-Tenant-Id',
        required: false,
      },
    ]);
    integrationRepository.findById.mockResolvedValue(integration);

    const result = await useCase.execute(
      new SetUserMcpConfigCommand(integrationId, {
        personalToken: 'my-personal-token',
        tenantId: 'my-tenant-123',
      }),
    );

    expect(result.hasConfig).toBe(true);
    expect(result.configValues).toEqual({
      personalToken: '***',
      tenantId: 'my-tenant-123',
    });
    expect(userConfigRepository.save).toHaveBeenCalled();
  });

  it('should update existing user config and return masked result', async () => {
    const integration = createMarketplaceIntegration([
      {
        key: 'personalToken',
        type: 'secret' as const,
        label: 'Personal Access Token',
        headerName: 'Authorization',
        prefix: 'Bearer ',
        required: false,
      },
    ]);
    integrationRepository.findById.mockResolvedValue(integration);

    const existingConfig = new McpIntegrationUserConfig({
      integrationId,
      userId,
      configValues: { personalToken: 'encrypted:old-token' },
    });
    userConfigRepository.findByIntegrationAndUser.mockResolvedValue(
      existingConfig,
    );

    const result = await useCase.execute(
      new SetUserMcpConfigCommand(integrationId, {
        personalToken: 'new-personal-token',
      }),
    );

    expect(result.hasConfig).toBe(true);
    expect(result.configValues).toEqual({
      personalToken: '***',
    });
  });

  it('should throw when integration is not found', async () => {
    integrationRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new SetUserMcpConfigCommand(integrationId, {
          personalToken: 'token',
        }),
      ),
    ).rejects.toThrow(McpIntegrationNotFoundError);
  });

  it('should throw when integration is not a marketplace integration', async () => {
    const customIntegration = new CustomMcpIntegration({
      id: integrationId,
      orgId,
      name: 'Custom Integration',
      serverUrl: 'https://custom.example.com/mcp',
      auth: new NoAuthMcpIntegrationAuth({}),
    });
    integrationRepository.findById.mockResolvedValue(customIntegration);

    await expect(
      useCase.execute(
        new SetUserMcpConfigCommand(integrationId, {
          personalToken: 'token',
        }),
      ),
    ).rejects.toThrow(McpNotMarketplaceIntegrationError);
  });

  it('should throw when integration has no user fields', async () => {
    const integration = createMarketplaceIntegration([]);
    integrationRepository.findById.mockResolvedValue(integration);

    await expect(
      useCase.execute(
        new SetUserMcpConfigCommand(integrationId, {
          personalToken: 'token',
        }),
      ),
    ).rejects.toThrow(McpNoUserFieldsError);
  });

  it('should throw McpIntegrationAccessDeniedError when integration belongs to a different org', async () => {
    const differentOrgId = '990e8400-e29b-41d4-a716-446655440099' as UUID;
    const integration = createMarketplaceIntegration([
      {
        key: 'personalToken',
        type: 'secret' as const,
        label: 'Personal Access Token',
        headerName: 'Authorization',
        prefix: 'Bearer ',
        required: false,
      },
    ]);
    // Override orgId on the integration to simulate cross-tenant access
    Object.defineProperty(integration, 'orgId', { value: differentOrgId });
    integrationRepository.findById.mockResolvedValue(integration);

    await expect(
      useCase.execute(
        new SetUserMcpConfigCommand(integrationId, {
          personalToken: 'my-token',
        }),
      ),
    ).rejects.toThrow(McpIntegrationAccessDeniedError);
  });

  it('should not encrypt non-secret field values', async () => {
    const integration = createMarketplaceIntegration([
      {
        key: 'tenantId',
        type: 'text' as const,
        label: 'Tenant ID',
        headerName: 'X-Tenant-Id',
        required: false,
      },
    ]);
    integrationRepository.findById.mockResolvedValue(integration);

    const result = await useCase.execute(
      new SetUserMcpConfigCommand(integrationId, {
        tenantId: 'my-tenant-123',
      }),
    );

    expect(result.configValues).toEqual({ tenantId: 'my-tenant-123' });
    expect(credentialEncryption.encrypt).not.toHaveBeenCalled();
  });

  it('should reject config keys that are not defined in userFields', async () => {
    const integration = createMarketplaceIntegration([
      {
        key: 'personalToken',
        type: 'secret' as const,
        label: 'Personal Access Token',
        headerName: 'Authorization',
        prefix: 'Bearer ',
        required: false,
      },
    ]);
    integrationRepository.findById.mockResolvedValue(integration);

    await expect(
      useCase.execute(
        new SetUserMcpConfigCommand(integrationId, {
          personalToken: 'my-token',
          unknownField: 'some-value',
          anotherBadKey: 'evil-data',
        }),
      ),
    ).rejects.toThrow(McpInvalidConfigKeysError);
  });
});
