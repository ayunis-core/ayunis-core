import { GetUserMcpConfigUseCase } from './get-user-mcp-config.use-case';
import { GetUserMcpConfigQuery } from './get-user-mcp-config.query';
import type { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import type { McpIntegrationUserConfigRepositoryPort } from '../../ports/mcp-integration-user-config.repository.port';
import type { ContextService } from 'src/common/context/services/context.service';
import { McpIntegrationUserConfig } from '../../../domain/mcp-integration-user-config.entity';
import { MarketplaceMcpIntegration } from '../../../domain/integrations/marketplace-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from '../../../domain/auth/no-auth-mcp-integration-auth.entity';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
} from '../../mcp.errors';
import type { UUID } from 'crypto';

describe('GetUserMcpConfigUseCase', () => {
  let useCase: GetUserMcpConfigUseCase;
  let integrationRepository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let userConfigRepository: jest.Mocked<McpIntegrationUserConfigRepositoryPort>;
  let contextService: jest.Mocked<ContextService>;

  const userId = '770e8400-e29b-41d4-a716-446655440001' as UUID;
  const orgId = '660e8400-e29b-41d4-a716-446655440001' as UUID;
  const integrationId = '550e8400-e29b-41d4-a716-446655440000' as UUID;

  const createMarketplaceIntegration = (overrideOrgId?: UUID) =>
    new MarketplaceMcpIntegration({
      id: integrationId,
      orgId: overrideOrgId ?? orgId,
      name: 'Locaboo Booking',
      serverUrl: 'https://mcp.ayunis.de/locaboo',
      auth: new NoAuthMcpIntegrationAuth({}),
      marketplaceIdentifier: 'locaboo-booking',
      configSchema: {
        authType: 'BEARER_TOKEN',
        orgFields: [],
        userFields: [
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
        ],
      },
      orgConfigValues: {},
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

    contextService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;

    contextService.get.mockImplementation((key?: string | symbol) => {
      if (key === 'userId') return userId;
      if (key === 'orgId') return orgId;
      return undefined;
    });

    integrationRepository.findById.mockResolvedValue(
      createMarketplaceIntegration(),
    );

    useCase = new GetUserMcpConfigUseCase(
      integrationRepository,
      userConfigRepository,
      contextService,
    );
  });

  it('should mask only secret fields and return non-secret values as-is', async () => {
    const userConfig = new McpIntegrationUserConfig({
      integrationId,
      userId,
      configValues: {
        personalToken: 'encrypted:my-secret-token',
        tenantId: 'my-tenant-123',
      },
    });
    userConfigRepository.findByIntegrationAndUser.mockResolvedValue(userConfig);

    const result = await useCase.execute(
      new GetUserMcpConfigQuery(integrationId),
    );

    expect(result.hasConfig).toBe(true);
    expect(result.configValues).toEqual({
      personalToken: '***',
      tenantId: 'my-tenant-123',
    });
    expect(userConfigRepository.findByIntegrationAndUser).toHaveBeenCalledWith(
      integrationId,
      userId,
    );
  });

  it('should return empty result when no user config exists', async () => {
    userConfigRepository.findByIntegrationAndUser.mockResolvedValue(null);

    const result = await useCase.execute(
      new GetUserMcpConfigQuery(integrationId),
    );

    expect(result.hasConfig).toBe(false);
    expect(result.configValues).toEqual({});
  });

  it('should throw McpIntegrationNotFoundError when integration does not exist', async () => {
    integrationRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(new GetUserMcpConfigQuery(integrationId)),
    ).rejects.toThrow(McpIntegrationNotFoundError);
  });

  it('should throw McpIntegrationAccessDeniedError when integration belongs to a different org', async () => {
    const differentOrgId = '990e8400-e29b-41d4-a716-446655440099' as UUID;
    integrationRepository.findById.mockResolvedValue(
      createMarketplaceIntegration(differentOrgId),
    );

    await expect(
      useCase.execute(new GetUserMcpConfigQuery(integrationId)),
    ).rejects.toThrow(McpIntegrationAccessDeniedError);
  });

  it('should throw when user is not authenticated', async () => {
    contextService.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(new GetUserMcpConfigQuery(integrationId)),
    ).rejects.toThrow('User not authenticated');
  });
});
