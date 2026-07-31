import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DiscoverMcpCapabilitiesUseCase } from './discover-mcp-capabilities.use-case';
import { DiscoverMcpCapabilitiesQuery } from './discover-mcp-capabilities.query';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpClientService } from '../../services/mcp-client.service';
import { McpCapabilityCacheService } from '../../services/mcp-capability-cache.service';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpIntegrationDisabledError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { PredefinedMcpIntegration } from 'src/domain/mcp/domain/integrations/predefined-mcp-integration.entity';
import { CustomMcpIntegration } from 'src/domain/mcp/domain/integrations/custom-mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from 'src/domain/mcp/domain/value-objects/predefined-mcp-integration-slug.enum';
import { NoAuthMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/no-auth-mcp-integration-auth.entity';
import { BearerMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/bearer-mcp-integration-auth.entity';

describe('DiscoverMcpCapabilitiesUseCase', () => {
  let useCase: DiscoverMcpCapabilitiesUseCase;
  let repository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let mcpClientService: jest.Mocked<McpClientService>;
  let contextService: jest.Mocked<ContextService>;
  let capabilityCache: McpCapabilityCacheService;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const mockOrgId = randomUUID();
  const mockUserId = randomUUID();
  const mockIntegrationId = randomUUID();

  const mockContextGet = (key?: string | symbol) => {
    if (key === 'orgId') return mockOrgId;
    if (key === 'userId') return mockUserId;
    return undefined;
  };

  const buildPredefinedIntegration = (
    overrides: Partial<
      ConstructorParameters<typeof PredefinedMcpIntegration>[0]
    > = {},
  ) =>
    new PredefinedMcpIntegration({
      id: overrides.id ?? mockIntegrationId,
      name: overrides.name ?? 'Predefined Integration',
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

  const buildCustomIntegration = (
    overrides: Partial<
      ConstructorParameters<typeof CustomMcpIntegration>[0]
    > = {},
  ) =>
    new CustomMcpIntegration({
      id: overrides.id ?? mockIntegrationId,
      name: overrides.name ?? 'Custom Integration',
      orgId: overrides.orgId ?? mockOrgId,
      serverUrl: overrides.serverUrl ?? 'https://custom.example.com/mcp',
      auth:
        overrides.auth ??
        new BearerMcpIntegrationAuth({ authToken: 'encrypted-token' }),
      enabled: overrides.enabled ?? true,
      connectionStatus: overrides.connectionStatus,
      lastConnectionError: overrides.lastConnectionError,
      lastConnectionCheck: overrides.lastConnectionCheck,
      createdAt: overrides.createdAt,
      updatedAt: overrides.updatedAt,
    });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoverMcpCapabilitiesUseCase,
        McpCapabilityCacheService,
        {
          provide: McpIntegrationsRepositoryPort,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: McpClientService,
          useValue: {
            listTools: jest.fn(),
            listResources: jest.fn(),
            listResourceTemplates: jest.fn(),
            listPrompts: jest.fn(),
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

    useCase = module.get(DiscoverMcpCapabilitiesUseCase);
    repository = module.get(McpIntegrationsRepositoryPort);
    mcpClientService = module.get(McpClientService);
    contextService = module.get(ContextService);
    capabilityCache = module.get(McpCapabilityCacheService);

    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    capabilityCache.clear();
  });

  const arrangeSuccessfulClientCalls = () => {
    mcpClientService.listTools.mockResolvedValue([
      {
        name: 'test_tool',
        description: 'Tool description',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
    ]);
    mcpClientService.listResources.mockResolvedValue([
      {
        uri: 'file://static.txt',
        name: 'Static Resource',
        description: 'Static description',
        mimeType: 'text/plain',
      },
    ]);
    mcpClientService.listResourceTemplates.mockResolvedValue([
      {
        uri: 'dynamic://{id}',
        name: 'Dynamic Resource',
        description: 'Dynamic description',
        mimeType: 'application/json',
      },
    ]);
    mcpClientService.listPrompts.mockResolvedValue([
      {
        name: 'test_prompt',
        description: 'Prompt description',
        arguments: [{ name: 'arg', required: true }],
      },
    ]);
  };

  describe('execute', () => {
    it('discovers capabilities for enabled predefined integration', async () => {
      const integration = buildPredefinedIntegration();
      arrangeSuccessfulClientCalls();

      contextService.get.mockImplementation(mockContextGet);
      repository.findById.mockResolvedValue(integration);

      const result = await useCase.execute(
        new DiscoverMcpCapabilitiesQuery(mockIntegrationId),
      );

      expect(result.tools).toHaveLength(1);
      expect(result.resources).toHaveLength(2);
      expect(result.prompts).toHaveLength(1);
      expect(
        result.resources.every(
          (resource) => resource.integrationId === mockIntegrationId,
        ),
      ).toBe(true);

      expect(mcpClientService.listTools).toHaveBeenCalledWith(
        integration,
        mockUserId,
      );
      expect(mcpClientService.listResourceTemplates).toHaveBeenCalledWith(
        integration,
        mockUserId,
      );
      expect(loggerLogSpy).toHaveBeenCalledWith('discoverMcpCapabilities', {
        id: mockIntegrationId,
      });
      expect(loggerLogSpy).toHaveBeenCalledWith(
        'discoverMcpCapabilitiesSucceeded',
        expect.objectContaining({
          id: mockIntegrationId,
          name: integration.name,
          tools: 1,
          resources: 2,
          prompts: 1,
        }),
      );
    });

    it('supports custom integrations via client service', async () => {
      const integration = buildCustomIntegration();
      arrangeSuccessfulClientCalls();

      contextService.get.mockImplementation(mockContextGet);
      repository.findById.mockResolvedValue(integration);

      await useCase.execute(
        new DiscoverMcpCapabilitiesQuery(mockIntegrationId),
      );

      expect(mcpClientService.listTools).toHaveBeenCalledWith(
        integration,
        mockUserId,
      );
      expect(mcpClientService.listResources).toHaveBeenCalledWith(
        integration,
        mockUserId,
      );
      expect(mcpClientService.listPrompts).toHaveBeenCalledWith(
        integration,
        mockUserId,
      );
    });

    it('throws McpIntegrationNotFoundError when integration is missing', async () => {
      contextService.get.mockImplementation(mockContextGet);
      repository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute(new DiscoverMcpCapabilitiesQuery(mockIntegrationId)),
      ).rejects.toThrow(McpIntegrationNotFoundError);

      expect(mcpClientService.listTools).not.toHaveBeenCalled();
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('throws McpIntegrationAccessDeniedError for different organization', async () => {
      const integration = buildPredefinedIntegration({ orgId: randomUUID() });

      contextService.get.mockImplementation(mockContextGet);
      repository.findById.mockResolvedValue(integration);

      await expect(
        useCase.execute(new DiscoverMcpCapabilitiesQuery(mockIntegrationId)),
      ).rejects.toThrow(McpIntegrationAccessDeniedError);

      expect(mcpClientService.listTools).not.toHaveBeenCalled();
    });

    it('throws McpIntegrationDisabledError when integration disabled', async () => {
      const integration = buildPredefinedIntegration({ enabled: false });

      contextService.get.mockImplementation(mockContextGet);
      repository.findById.mockResolvedValue(integration);

      await expect(
        useCase.execute(new DiscoverMcpCapabilitiesQuery(mockIntegrationId)),
      ).rejects.toThrow(McpIntegrationDisabledError);

      expect(mcpClientService.listTools).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when user not authenticated', async () => {
      contextService.get.mockReturnValue(undefined);

      await expect(
        useCase.execute(new DiscoverMcpCapabilitiesQuery(mockIntegrationId)),
      ).rejects.toThrow(UnauthorizedException);

      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('serves repeated discoveries from the cache without re-contacting the server', async () => {
      const integration = buildPredefinedIntegration();
      arrangeSuccessfulClientCalls();

      contextService.get.mockImplementation(mockContextGet);
      repository.findById.mockResolvedValue(integration);

      const first = await useCase.execute(
        new DiscoverMcpCapabilitiesQuery(mockIntegrationId),
      );
      const second = await useCase.execute(
        new DiscoverMcpCapabilitiesQuery(mockIntegrationId),
      );

      expect(second.tools).toHaveLength(first.tools.length);
      expect(second.resources).toHaveLength(first.resources.length);
      expect(mcpClientService.listTools).toHaveBeenCalledTimes(1);
      expect(mcpClientService.listResources).toHaveBeenCalledTimes(1);
      expect(mcpClientService.listResourceTemplates).toHaveBeenCalledTimes(1);
      expect(mcpClientService.listPrompts).toHaveBeenCalledTimes(1);
    });

    it('serves a cached discovery failure without re-contacting the server', async () => {
      const integration = buildPredefinedIntegration();
      arrangeSuccessfulClientCalls();

      contextService.get.mockImplementation(mockContextGet);
      repository.findById.mockResolvedValue(integration);
      mcpClientService.listTools.mockRejectedValue(
        new Error('This operation was aborted'),
      );

      await expect(
        useCase.execute(new DiscoverMcpCapabilitiesQuery(mockIntegrationId)),
      ).rejects.toThrow(UnexpectedMcpError);
      await expect(
        useCase.execute(new DiscoverMcpCapabilitiesQuery(mockIntegrationId)),
      ).rejects.toThrow(UnexpectedMcpError);

      expect(mcpClientService.listTools).toHaveBeenCalledTimes(1);
    });

    it('discovers with the integration state read at load time, not the access-check snapshot', async () => {
      const staleIntegration = buildPredefinedIntegration({
        name: 'Before Update',
      });
      const updatedIntegration = buildPredefinedIntegration({
        name: 'After Update',
      });
      arrangeSuccessfulClientCalls();

      contextService.get.mockImplementation(mockContextGet);
      repository.findById
        .mockResolvedValueOnce(staleIntegration)
        .mockResolvedValueOnce(updatedIntegration);

      await useCase.execute(
        new DiscoverMcpCapabilitiesQuery(mockIntegrationId),
      );

      expect(mcpClientService.listTools).toHaveBeenCalledWith(
        updatedIntegration,
        mockUserId,
      );
      expect(mcpClientService.listPrompts).toHaveBeenCalledWith(
        updatedIntegration,
        mockUserId,
      );
    });

    it('re-checks access and enabled state even on a cache hit', async () => {
      const integration = buildPredefinedIntegration();
      arrangeSuccessfulClientCalls();

      contextService.get.mockImplementation(mockContextGet);
      repository.findById.mockResolvedValue(integration);

      await useCase.execute(
        new DiscoverMcpCapabilitiesQuery(mockIntegrationId),
      );

      repository.findById.mockResolvedValue(
        buildPredefinedIntegration({ enabled: false }),
      );

      await expect(
        useCase.execute(new DiscoverMcpCapabilitiesQuery(mockIntegrationId)),
      ).rejects.toThrow(McpIntegrationDisabledError);
    });

    it('wraps unexpected errors in UnexpectedMcpError without leaking internals', async () => {
      const integration = buildPredefinedIntegration();
      const unexpectedError = new Error(
        'connect ECONNREFUSED internal-db:5432',
      );

      contextService.get.mockImplementation(mockContextGet);
      repository.findById.mockResolvedValue(integration);
      mcpClientService.listTools.mockRejectedValue(unexpectedError);

      const rejection = await useCase
        .execute(new DiscoverMcpCapabilitiesQuery(mockIntegrationId))
        .then(
          () => {
            throw new Error('expected execute to reject');
          },
          (error: unknown) => error,
        );

      expect(rejection).toBeInstanceOf(UnexpectedMcpError);
      // The client-facing message and serialized metadata must stay generic;
      // the original error travels on the non-serialized `cause`.
      expect((rejection as UnexpectedMcpError).message).toBe(
        'Unexpected error occurred',
      );
      expect((rejection as UnexpectedMcpError).cause).toBe(unexpectedError);
      expect((rejection as UnexpectedMcpError).metadata).toBeUndefined();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Unexpected use-case error',
        expect.any(String),
      );
    });
  });
});
