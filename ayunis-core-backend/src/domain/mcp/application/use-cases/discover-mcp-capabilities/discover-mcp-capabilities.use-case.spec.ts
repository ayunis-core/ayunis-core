import { Logger } from '@nestjs/common';
import {
  createLoggerMock,
  type LoggerMock,
} from 'src/common/testing/logger.mock';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DiscoverMcpCapabilitiesUseCase } from './discover-mcp-capabilities.use-case';
import { DiscoverMcpCapabilitiesQuery } from './discover-mcp-capabilities.query';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { McpClientService } from 'src/domain/mcp/application/services/mcp-client.service';
import { McpCapabilityCacheService } from 'src/domain/mcp/application/services/mcp-capability-cache.service';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpIntegrationDisabledError,
  McpConnectionTimeoutError,
  UnexpectedMcpError,
} from 'src/domain/mcp/application/mcp.errors';
import { PredefinedMcpIntegration } from 'src/domain/mcp/domain/integrations/predefined-mcp-integration.entity';
import type { CustomMcpIntegration } from 'src/domain/mcp/domain/integrations/custom-mcp-integration.entity';
import { aCustomMcpIntegration } from 'src/domain/mcp/application/testing/mcp-integration.fixtures';
import { PredefinedMcpIntegrationSlug } from 'src/domain/mcp/domain/value-objects/predefined-mcp-integration-slug.enum';
import { NoAuthMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/no-auth-mcp-integration-auth.entity';
import { BearerMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/bearer-mcp-integration-auth.entity';

describe('DiscoverMcpCapabilitiesUseCase', () => {
  let logger: LoggerMock;
  let useCase: DiscoverMcpCapabilitiesUseCase;
  let repository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let mcpClientService: jest.Mocked<McpClientService>;
  let contextService: jest.Mocked<ContextService>;
  let capabilityCache: McpCapabilityCacheService;
  let decoratorErrorSpy: jest.SpyInstance;

  const mockOrgId = randomUUID();
  const mockUserId = randomUUID();
  const mockIntegrationId = randomUUID();
  const capabilityDiscoveryOptions = { timeout: 10000 };

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
    aCustomMcpIntegration({
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
    logger = createLoggerMock();
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
            discoverCapabilities: jest.fn(),
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
    decoratorErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    capabilityCache.clear();
  });

  const arrangeSuccessfulClientCalls = () => {
    mcpClientService.discoverCapabilities.mockResolvedValue({
      tools: [
        {
          name: 'test_tool',
          description: 'Tool description',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
      ],
      resources: [
        {
          uri: 'file://static.txt',
          name: 'Static Resource',
          description: 'Static description',
          mimeType: 'text/plain',
        },
      ],
      resourceTemplates: [
        {
          uri: 'dynamic://{id}',
          name: 'Dynamic Resource',
          description: 'Dynamic description',
          mimeType: 'application/json',
        },
      ],
      prompts: [
        {
          name: 'test_prompt',
          description: 'Prompt description',
          arguments: [{ name: 'arg', required: true }],
        },
      ],
    });
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

      expect(mcpClientService.discoverCapabilities).toHaveBeenCalledWith(
        integration,
        mockUserId,
        capabilityDiscoveryOptions,
      );
      expect(logger.log).toHaveBeenCalledWith(
        {
          id: mockIntegrationId,
        },
        'discoverMcpCapabilities',
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockIntegrationId,
          name: integration.name,
          toolCount: 1,
          resources: 2,
          prompts: 1,
        }),
        'discoverMcpCapabilitiesSucceeded',
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

      expect(mcpClientService.discoverCapabilities).toHaveBeenCalledWith(
        integration,
        mockUserId,
        capabilityDiscoveryOptions,
      );
    });

    it('throws McpIntegrationNotFoundError when integration is missing', async () => {
      contextService.get.mockImplementation(mockContextGet);
      repository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute(new DiscoverMcpCapabilitiesQuery(mockIntegrationId)),
      ).rejects.toThrow(McpIntegrationNotFoundError);

      expect(mcpClientService.discoverCapabilities).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('throws McpIntegrationAccessDeniedError for different organization', async () => {
      const integration = buildPredefinedIntegration({ orgId: randomUUID() });

      contextService.get.mockImplementation(mockContextGet);
      repository.findById.mockResolvedValue(integration);

      await expect(
        useCase.execute(new DiscoverMcpCapabilitiesQuery(mockIntegrationId)),
      ).rejects.toThrow(McpIntegrationAccessDeniedError);

      expect(mcpClientService.discoverCapabilities).not.toHaveBeenCalled();
    });

    it('throws McpIntegrationDisabledError when integration disabled', async () => {
      const integration = buildPredefinedIntegration({ enabled: false });

      contextService.get.mockImplementation(mockContextGet);
      repository.findById.mockResolvedValue(integration);

      await expect(
        useCase.execute(new DiscoverMcpCapabilitiesQuery(mockIntegrationId)),
      ).rejects.toThrow(McpIntegrationDisabledError);

      expect(mcpClientService.discoverCapabilities).not.toHaveBeenCalled();
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
      expect(mcpClientService.discoverCapabilities).toHaveBeenCalledTimes(1);
    });

    it('serves a cached discovery failure without re-contacting the server', async () => {
      const integration = buildPredefinedIntegration();
      arrangeSuccessfulClientCalls();

      contextService.get.mockImplementation(mockContextGet);
      repository.findById.mockResolvedValue(integration);
      mcpClientService.discoverCapabilities.mockRejectedValue(
        new Error('This operation was aborted'),
      );

      await expect(
        useCase.execute(new DiscoverMcpCapabilitiesQuery(mockIntegrationId)),
      ).rejects.toThrow(UnexpectedMcpError);
      await expect(
        useCase.execute(new DiscoverMcpCapabilitiesQuery(mockIntegrationId)),
      ).rejects.toThrow(UnexpectedMcpError);

      expect(mcpClientService.discoverCapabilities).toHaveBeenCalledTimes(1);
    });

    // A classified timeout must not be re-wrapped as UNEXPECTED_MCP_ERROR —
    // the send-message assembler skips the integration on any rejection, and
    // the classified code is what keeps AppSignal grouping stable (AYC-651).
    it('propagates a classified connection timeout unchanged', async () => {
      const integration = buildPredefinedIntegration();
      arrangeSuccessfulClientCalls();

      contextService.get.mockImplementation(mockContextGet);
      repository.findById.mockResolvedValue(integration);
      mcpClientService.discoverCapabilities.mockRejectedValue(
        new McpConnectionTimeoutError('https://mcp.example.com/mcp', 30000),
      );

      await expect(
        useCase.execute(new DiscoverMcpCapabilitiesQuery(mockIntegrationId)),
      ).rejects.toThrow(McpConnectionTimeoutError);
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

      expect(mcpClientService.discoverCapabilities).toHaveBeenCalledWith(
        updatedIntegration,
        mockUserId,
        capabilityDiscoveryOptions,
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
      mcpClientService.discoverCapabilities.mockRejectedValue(unexpectedError);

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
      expect(decoratorErrorSpy).toHaveBeenCalledWith(
        { err: unexpectedError },
        'Unexpected use-case error',
      );
    });
  });

  describe('openai/fileParams', () => {
    const fileSchema = {
      type: 'object',
      properties: { file: { type: 'object' } },
      required: ['file'],
    };

    const discoverTools = async (
      tools: Awaited<
        ReturnType<McpClientService['discoverCapabilities']>
      >['tools'],
    ) => {
      mcpClientService.discoverCapabilities.mockResolvedValue({
        tools,
        resources: [],
        resourceTemplates: [],
        prompts: [],
      });
      contextService.get.mockImplementation(mockContextGet);
      repository.findById.mockResolvedValue(buildCustomIntegration());

      const result = await useCase.execute(
        new DiscoverMcpCapabilitiesQuery(mockIntegrationId),
      );
      return new Map(result.tools.map((tool) => [tool.name, tool]));
    };

    it('carries the declared file fields on the tool, also when served from the cache, and gives undeclared tools none', async () => {
      const tools = [
        {
          name: 'start_pdf_file',
          inputSchema: fileSchema,
          _meta: { 'openai/fileParams': ['file'] },
        },
        { name: 'get_status', inputSchema: { type: 'object' } },
        {
          name: 'other_meta',
          inputSchema: { type: 'object' },
          _meta: { 'vendor/flag': true },
        },
      ];

      const discovered = await discoverTools(tools);
      const cached = await discoverTools(tools);

      expect(mcpClientService.discoverCapabilities).toHaveBeenCalledTimes(1);
      for (const result of [discovered, cached]) {
        expect(result.get('start_pdf_file')?.fileParams).toEqual(['file']);
        expect(result.get('start_pdf_file')?.inputSchema).toEqual(fileSchema);
        expect(result.get('get_status')?.fileParams).toEqual([]);
        expect(result.get('other_meta')?.fileParams).toEqual([]);
      }
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it.each([
      ['a string', 'file'],
      ['an object', { file: true }],
      ['null', null],
      ['an array with a non-string', ['file', 1]],
    ])(
      'treats a declaration that is %s as no file fields and warns naming the integration and tool',
      async (_label, declaration) => {
        const discovered = await discoverTools([
          {
            name: 'start_pdf_file',
            inputSchema: fileSchema,
            _meta: { 'openai/fileParams': declaration },
          },
        ]);

        expect(discovered.get('start_pdf_file')?.fileParams).toEqual([]);
        expect(logger.warn).toHaveBeenCalledWith(
          expect.objectContaining({
            integrationId: mockIntegrationId,
            integrationName: 'Custom Integration',
            toolName: 'start_pdf_file',
          }),
          expect.any(String),
        );
      },
    );
  });
});
