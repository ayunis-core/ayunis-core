import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DiscoverMcpCapabilitiesUseCase } from './discover-mcp-capabilities.use-case';
import { DiscoverMcpCapabilitiesQuery } from './discover-mcp-capabilities.query';
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
import { CustomMcpIntegration } from '../../../domain/integrations/custom-mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { NoAuthMcpIntegrationAuth } from '../../../domain/auth/no-auth-mcp-integration-auth.entity';
import { BearerMcpIntegrationAuth } from '../../../domain/auth/bearer-mcp-integration-auth.entity';

describe('DiscoverMcpCapabilitiesUseCase', () => {
  let useCase: DiscoverMcpCapabilitiesUseCase;
  let repository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let mcpClientService: jest.Mocked<McpClientService>;
  let contextService: jest.Mocked<ContextService>;
  let loggerLogSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoverMcpCapabilitiesUseCase,
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

    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const arrangeSuccessfulClientCalls = () => {
    mcpClientService.listTools.mockResolvedValue([
      {
        name: 'test_tool',
        description: 'Tool description',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
    ] as any);
    mcpClientService.listResources.mockResolvedValue([
      {
        uri: 'file://static.txt',
        name: 'Static Resource',
        description: 'Static description',
        mimeType: 'text/plain',
      },
    ] as any);
    mcpClientService.listResourceTemplates.mockResolvedValue([
      {
        uri: 'dynamic://{id}',
        name: 'Dynamic Resource',
        description: 'Dynamic description',
        mimeType: 'application/json',
      },
    ] as any);
    mcpClientService.listPrompts.mockResolvedValue([
      {
        name: 'test_prompt',
        description: 'Prompt description',
        arguments: [{ name: 'arg', required: true }],
      },
    ] as any);
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
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'discoverMcpCapabilitiesFailed',
        expect.objectContaining({ id: mockIntegrationId }),
      );
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

    it('wraps unexpected errors in UnexpectedMcpError', async () => {
      const integration = buildPredefinedIntegration();
      const unexpectedError = new Error('Connection timeout');

      contextService.get.mockImplementation(mockContextGet);
      repository.findById.mockResolvedValue(integration);
      mcpClientService.listTools.mockRejectedValue(unexpectedError);

      await expect(
        useCase.execute(new DiscoverMcpCapabilitiesQuery(mockIntegrationId)),
      ).rejects.toThrow(UnexpectedMcpError);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'discoverMcpCapabilitiesUnexpectedError',
        expect.objectContaining({
          id: mockIntegrationId,
          error: 'Connection timeout',
        }),
      );
    });
  });
});
