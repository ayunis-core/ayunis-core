import { randomUUID } from 'crypto';
import { ValidateMcpIntegrationUseCase } from './validate-mcp-integration.use-case';
import { ValidateMcpIntegrationCommand } from './validate-mcp-integration.command';
import type { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import type { McpClientService } from '../../services/mcp-client.service';
import type { ContextService } from 'src/common/context/services/context.service';
import { MarketplaceMcpIntegration } from '../../../domain/integrations/marketplace-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from '../../../domain/auth/no-auth-mcp-integration-auth.entity';

describe('ValidateMcpIntegrationUseCase', () => {
  let useCase: ValidateMcpIntegrationUseCase;
  let repository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let mcpClientService: jest.Mocked<McpClientService>;
  let contextService: jest.Mocked<ContextService>;

  const orgId = randomUUID();
  const userId = randomUUID();
  const integrationId = randomUUID();

  const buildIntegration = () =>
    new MarketplaceMcpIntegration({
      id: integrationId,
      orgId,
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
            required: true,
          },
        ],
      },
      orgConfigValues: {},
    });

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      findAll: jest.fn(),
      findByOrgIdAndSlug: jest.fn(),
      findByOrgIdAndMarketplaceIdentifier: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<McpIntegrationsRepositoryPort>;

    mcpClientService = {
      listTools: jest.fn().mockResolvedValue([{ name: 'book-room' }]),
      listResources: jest.fn().mockResolvedValue([]),
      listResourceTemplates: jest.fn().mockResolvedValue([]),
      listPrompts: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<McpClientService>;

    contextService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;

    contextService.get.mockImplementation((key?: string | symbol) => {
      if (key === 'orgId') return orgId;
      if (key === 'userId') return userId;
      return undefined;
    });

    repository.findById.mockResolvedValue(buildIntegration());

    useCase = new ValidateMcpIntegrationUseCase(
      repository,
      mcpClientService,
      contextService,
    );
  });

  it('should pass userId to MCP client when collecting capabilities', async () => {
    const command = new ValidateMcpIntegrationCommand(integrationId);
    const integration = buildIntegration();
    repository.findById.mockResolvedValue(integration);

    await useCase.execute(command);

    expect(mcpClientService.listTools).toHaveBeenCalledWith(
      integration,
      userId,
    );
    expect(mcpClientService.listResources).toHaveBeenCalledWith(
      integration,
      userId,
    );
    expect(mcpClientService.listResourceTemplates).toHaveBeenCalledWith(
      integration,
      userId,
    );
    expect(mcpClientService.listPrompts).toHaveBeenCalledWith(
      integration,
      userId,
    );
  });
});
