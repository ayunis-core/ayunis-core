import { GetUserMcpConfigUseCase } from './get-user-mcp-config.use-case';
import { GetUserMcpConfigQuery } from './get-user-mcp-config.query';
import { McpIntegrationUserConfigRepositoryPort } from '../../ports/mcp-integration-user-config.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegrationUserConfig } from '../../../domain/mcp-integration-user-config.entity';
import { UUID } from 'crypto';

describe('GetUserMcpConfigUseCase', () => {
  let useCase: GetUserMcpConfigUseCase;
  let userConfigRepository: jest.Mocked<McpIntegrationUserConfigRepositoryPort>;
  let contextService: jest.Mocked<ContextService>;

  const userId = '770e8400-e29b-41d4-a716-446655440001' as UUID;
  const integrationId = '550e8400-e29b-41d4-a716-446655440000' as UUID;

  beforeEach(() => {
    userConfigRepository = {
      save: jest.fn(),
      findByIntegrationAndUser: jest.fn(),
      deleteByIntegrationId: jest.fn(),
    } as jest.Mocked<McpIntegrationUserConfigRepositoryPort>;

    contextService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;

    contextService.get.mockReturnValue(userId);

    useCase = new GetUserMcpConfigUseCase(userConfigRepository, contextService);
  });

  it('should return masked config values when user config exists', async () => {
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
      tenantId: '***',
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

  it('should throw when user is not authenticated', async () => {
    contextService.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(new GetUserMcpConfigQuery(integrationId)),
    ).rejects.toThrow('User not authenticated');
  });
});
