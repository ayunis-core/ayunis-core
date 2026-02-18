import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RetrieveMcpResourceUseCase } from './retrieve-mcp-resource.use-case';
import { RetrieveMcpResourceCommand } from './retrieve-mcp-resource.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpClientService } from '../../services/mcp-client.service';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpIntegrationDisabledError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { PredefinedMcpIntegration } from '../../../domain/integrations/predefined-mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { NoAuthMcpIntegrationAuth } from '../../../domain/auth/no-auth-mcp-integration-auth.entity';

describe('RetrieveMcpResourceUseCase', () => {
  let useCase: RetrieveMcpResourceUseCase;
  let repository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let mcpClientService: jest.Mocked<McpClientService>;
  let contextService: jest.Mocked<ContextService>;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const mockOrgId = randomUUID();
  const mockUserId = randomUUID();
  const mockIntegrationId = randomUUID();
  const mockResourceUri = 'dataset://sales-data.csv';

  const buildIntegration = (
    overrides: Partial<
      ConstructorParameters<typeof PredefinedMcpIntegration>[0]
    > = {},
  ) =>
    new PredefinedMcpIntegration({
      id: overrides.id ?? mockIntegrationId,
      name: overrides.name ?? 'Test Integration',
      orgId: overrides.orgId ?? mockOrgId,
      slug: overrides.slug ?? PredefinedMcpIntegrationSlug.TEST,
      serverUrl: overrides.serverUrl ?? 'https://registry.example.com/mcp',
      auth: overrides.auth ?? new NoAuthMcpIntegrationAuth(),
      enabled: overrides.enabled ?? true,
      connectionStatus: overrides.connectionStatus,
      lastConnectionError: overrides.lastConnectionError,
      lastConnectionCheck: overrides.lastConnectionCheck,
      createdAt: overrides.createdAt,
      updatedAt: overrides.updatedAt,
    });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetrieveMcpResourceUseCase,
        {
          provide: McpIntegrationsRepositoryPort,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: McpClientService,
          useValue: {
            readResource: jest.fn(),
          },
        },
        {
          provide: ContextService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(RetrieveMcpResourceUseCase);
    repository = module.get(McpIntegrationsRepositoryPort);
    mcpClientService = module.get(McpClientService);
    contextService = module.get(ContextService);

    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('retrieves resource content and returns mime type', async () => {
      const integration = buildIntegration();
      const mockResponse = { content: 'file-content', mimeType: 'text/plain' };

      contextService.get.mockImplementation((key?: string | symbol) => {
        if (key === 'orgId') return mockOrgId;
        if (key === 'userId') return mockUserId;
        return undefined;
      });
      repository.findById.mockResolvedValue(integration);
      mcpClientService.readResource.mockResolvedValue(mockResponse);

      const result = await useCase.execute(
        new RetrieveMcpResourceCommand(mockIntegrationId, mockResourceUri),
      );

      expect(result).toEqual(mockResponse);
      expect(mcpClientService.readResource).toHaveBeenCalledWith(
        integration,
        mockResourceUri,
        undefined,
        mockUserId,
      );
      expect(loggerLogSpy).toHaveBeenCalledWith('retrieveMcpResource', {
        integrationId: mockIntegrationId,
        resourceUri: mockResourceUri,
        parameters: undefined,
      });
    });

    it('passes parameters through to client service with userId', async () => {
      const integration = buildIntegration();
      const parameters = { id: '123', locale: 'en' };

      contextService.get.mockImplementation((key?: string | symbol) => {
        if (key === 'orgId') return mockOrgId;
        if (key === 'userId') return mockUserId;
        return undefined;
      });
      repository.findById.mockResolvedValue(integration);
      mcpClientService.readResource.mockResolvedValue({
        content: { data: true },
        mimeType: 'application/json',
      });

      await useCase.execute(
        new RetrieveMcpResourceCommand(
          mockIntegrationId,
          mockResourceUri,
          parameters,
        ),
      );

      expect(mcpClientService.readResource).toHaveBeenCalledWith(
        integration,
        mockResourceUri,
        parameters,
        mockUserId,
      );
    });

    it('throws McpIntegrationNotFoundError when integration missing', async () => {
      contextService.get.mockReturnValue(mockOrgId);
      repository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute(
          new RetrieveMcpResourceCommand(mockIntegrationId, mockResourceUri),
        ),
      ).rejects.toThrow(McpIntegrationNotFoundError);

      expect(mcpClientService.readResource).not.toHaveBeenCalled();
    });

    it('throws McpIntegrationAccessDeniedError for different organization', async () => {
      const integration = buildIntegration({ orgId: randomUUID() });

      contextService.get.mockReturnValue(mockOrgId);
      repository.findById.mockResolvedValue(integration);

      await expect(
        useCase.execute(
          new RetrieveMcpResourceCommand(mockIntegrationId, mockResourceUri),
        ),
      ).rejects.toThrow(McpIntegrationAccessDeniedError);

      expect(mcpClientService.readResource).not.toHaveBeenCalled();
    });

    it('throws McpIntegrationDisabledError when integration disabled', async () => {
      const integration = buildIntegration({ enabled: false });

      contextService.get.mockReturnValue(mockOrgId);
      repository.findById.mockResolvedValue(integration);

      await expect(
        useCase.execute(
          new RetrieveMcpResourceCommand(mockIntegrationId, mockResourceUri),
        ),
      ).rejects.toThrow(McpIntegrationDisabledError);

      expect(mcpClientService.readResource).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when orgId missing', async () => {
      contextService.get.mockReturnValue(undefined);

      await expect(
        useCase.execute(
          new RetrieveMcpResourceCommand(mockIntegrationId, mockResourceUri),
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('wraps unexpected errors in UnexpectedMcpError', async () => {
      const integration = buildIntegration();
      const unexpectedError = new Error('Network failure');

      contextService.get.mockReturnValue(mockOrgId);
      repository.findById.mockResolvedValue(integration);
      mcpClientService.readResource.mockRejectedValue(unexpectedError);

      await expect(
        useCase.execute(
          new RetrieveMcpResourceCommand(mockIntegrationId, mockResourceUri),
        ),
      ).rejects.toThrow(UnexpectedMcpError);

      expect(loggerErrorSpy).toHaveBeenCalledWith('retrieveMcpResourceFailed', {
        integrationId: mockIntegrationId,
        resourceUri: mockResourceUri,
        error: 'Network failure',
      });
    });
  });
});
