import type { PinoLogger } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { getLoggerToken } from 'nestjs-pino';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { setError } from '@appsignal/nodejs';
import { ExecuteMcpToolUseCase } from './execute-mcp-tool.use-case';
import { ExecuteMcpToolCommand } from './execute-mcp-tool.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpClientService } from '../../services/mcp-client.service';
import { ContextService } from 'src/common/context/services/context.service';
import { ValidateIntegrationAccessService } from '../../services/validate-integration-access.service';
import {
  McpConnectionFailedError,
  McpConnectionTimeoutError,
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpIntegrationDisabledError,
  McpUnauthenticatedError,
  UnexpectedMcpError,
} from '../../mcp.errors';

jest.mock('@appsignal/nodejs', () => ({
  setError: jest.fn(),
}));
import { PredefinedMcpIntegration } from 'src/domain/mcp/domain/integrations/predefined-mcp-integration.entity';
import { aCustomMcpIntegration } from 'src/domain/mcp/application/testing/mcp-integration.fixtures';
import { PredefinedMcpIntegrationSlug } from 'src/domain/mcp/domain/value-objects/predefined-mcp-integration-slug.enum';
import { NoAuthMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/no-auth-mcp-integration-auth.entity';
import { BearerMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/bearer-mcp-integration-auth.entity';
import { McpIntegrationKind } from 'src/domain/mcp/domain/value-objects/mcp-integration-kind.enum';

const mockOrgId = randomUUID();
const mockUserId = randomUUID();
const mockIntegrationId = randomUUID();
const mockToolName = 'test-tool';
const mockParameters = { foo: 'bar' };

const buildPredefined = () =>
  new PredefinedMcpIntegration({
    id: mockIntegrationId,
    orgId: mockOrgId,
    name: 'Predefined Integration',
    slug: PredefinedMcpIntegrationSlug.TEST,
    serverUrl: 'http://localhost:3100/mcp',
    auth: new NoAuthMcpIntegrationAuth(),
  });

const buildCustom = () =>
  aCustomMcpIntegration({
    id: mockIntegrationId,
    orgId: mockOrgId,
    name: 'Custom Integration',
    serverUrl: 'https://example.com/mcp',
    auth: new BearerMcpIntegrationAuth({ authToken: 'encrypted-token' }),
  });

describe('ExecuteMcpToolUseCase', () => {
  let logger: jest.Mocked<PinoLogger>;
  let useCase: ExecuteMcpToolUseCase;
  let repository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let mcpClientService: {
    callTool: jest.Mock;
  };
  let contextService: jest.Mocked<ContextService>;

  beforeAll(async () => {
    logger = createPinoLoggerMock();
    repository = {
      findById: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn(),
      findByOrgIdAndSlug: jest.fn(),
      findByOrgIdAndMarketplaceIdentifier: jest.fn(),
      delete: jest.fn(),
    } as any;

    mcpClientService = {
      callTool: jest.fn(),
    };

    contextService = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecuteMcpToolUseCase,
        ValidateIntegrationAccessService,
        { provide: McpIntegrationsRepositoryPort, useValue: repository },
        { provide: McpClientService, useValue: mcpClientService },
        { provide: ContextService, useValue: contextService },

        {
          provide: getLoggerToken(ExecuteMcpToolUseCase.name),
          useValue: logger,
        },
      ],
    }).compile();

    useCase = module.get(ExecuteMcpToolUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildCommand = () =>
    new ExecuteMcpToolCommand(mockIntegrationId, mockToolName, mockParameters);

  it('returns successful tool execution result', async () => {
    const integration = buildPredefined();
    repository.findById.mockResolvedValue(integration);
    contextService.get.mockImplementation((key?: string | symbol) => {
      if (key === 'orgId') return mockOrgId;
      if (key === 'userId') return mockUserId;
      return undefined;
    });
    mcpClientService.callTool.mockResolvedValue({
      isError: false,
      content: { result: 'ok' },
    });

    const result = await useCase.execute(buildCommand());

    expect(result).toEqual({ isError: false, content: { result: 'ok' } });
    expect(mcpClientService.callTool).toHaveBeenCalledWith(
      integration,
      {
        toolName: mockToolName,
        parameters: mockParameters,
      },
      mockUserId,
    );
    expect(logger.info).toHaveBeenCalledWith(
      {
        operation: 'execute_tool',
        integration: {
          id: mockIntegrationId,
          name: 'Predefined Integration',
        },
        tool: { name: mockToolName },
        status: 'success',
        durationMs: expect.any(Number),
      },
      '[MCP] operation=execute_tool',
    );
  });

  it('returns error result when MCP client throws', async () => {
    const integration = buildPredefined();
    repository.findById.mockResolvedValue(integration);
    contextService.get.mockReturnValue(mockOrgId);
    mcpClientService.callTool.mockRejectedValue(new Error('tool failed'));

    const result = await useCase.execute(buildCommand());

    expect(result.isError).toBe(true);
    expect(result.errorMessage).toBe('tool failed');
    expect(logger.warn).toHaveBeenCalledWith(
      {
        operation: 'execute_tool',
        integration: {
          id: mockIntegrationId,
          name: 'Predefined Integration',
        },
        tool: { name: mockToolName },
        status: 'error',
        error: 'tool failed',
        durationMs: expect.any(Number),
      },
      '[MCP] operation=execute_tool',
    );
  });

  // The soft-handled tool result is the only place classified MCP outages
  // surface during a run — without reporting here, suppressing the raw
  // transport errnos (AYC-616) would leave connection outages invisible.
  it('reports a classified connection failure to AppSignal while soft-returning it to the LLM', async () => {
    const integration = buildPredefined();
    repository.findById.mockResolvedValue(integration);
    contextService.get.mockReturnValue(mockOrgId);
    const connectionError = new McpConnectionFailedError(
      'https://example.com/mcp',
      new Error('getaddrinfo EAI_AGAIN example.com'),
    );
    mcpClientService.callTool.mockRejectedValue(connectionError);

    const result = await useCase.execute(buildCommand());

    expect(result.isError).toBe(true);
    expect(setError).toHaveBeenCalledWith(connectionError);
  });

  it('reports a classified connection timeout to AppSignal while soft-returning it to the LLM', async () => {
    const integration = buildPredefined();
    repository.findById.mockResolvedValue(integration);
    contextService.get.mockReturnValue(mockOrgId);
    const timeoutError = new McpConnectionTimeoutError(
      'https://example.com/mcp',
      30_000,
    );
    mcpClientService.callTool.mockRejectedValue(timeoutError);

    const result = await useCase.execute(buildCommand());

    expect(result.isError).toBe(true);
    expect(setError).toHaveBeenCalledWith(timeoutError);
  });

  it('does not report tool-level failures that are not connection outages', async () => {
    const integration = buildPredefined();
    repository.findById.mockResolvedValue(integration);
    contextService.get.mockReturnValue(mockOrgId);
    mcpClientService.callTool.mockRejectedValue(new Error('Invalid params'));

    const result = await useCase.execute(buildCommand());

    expect(result.isError).toBe(true);
    expect(setError).not.toHaveBeenCalled();
  });

  it('throws when integration does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    contextService.get.mockReturnValue(mockOrgId);

    await expect(useCase.execute(buildCommand())).rejects.toBeInstanceOf(
      McpIntegrationNotFoundError,
    );
  });

  it('throws when integration belongs to different org', async () => {
    const integration = buildPredefined();
    repository.findById.mockResolvedValue(integration);
    contextService.get.mockReturnValue(randomUUID());

    await expect(useCase.execute(buildCommand())).rejects.toBeInstanceOf(
      McpIntegrationAccessDeniedError,
    );
  });

  it('throws when integration is disabled', async () => {
    const integration = buildPredefined();
    integration.disable();
    repository.findById.mockResolvedValue(integration);
    contextService.get.mockReturnValue(mockOrgId);

    await expect(useCase.execute(buildCommand())).rejects.toBeInstanceOf(
      McpIntegrationDisabledError,
    );
  });

  it('throws McpUnauthenticatedError when orgId missing', async () => {
    contextService.get.mockReturnValue(undefined);

    await expect(useCase.execute(buildCommand())).rejects.toBeInstanceOf(
      McpUnauthenticatedError,
    );
  });

  it('wraps unexpected errors in UnexpectedMcpError', async () => {
    contextService.get.mockReturnValue(mockOrgId);
    repository.findById.mockRejectedValue(new Error('boom'));

    await expect(useCase.execute(buildCommand())).rejects.toBeInstanceOf(
      UnexpectedMcpError,
    );
    expect(logger.error).toHaveBeenCalledWith(
      {
        err: expect.any(Error),
        operation: 'execute_tool',
        integration: { id: mockIntegrationId },
        tool: { name: mockToolName },
        status: 'unexpected_error',
        durationMs: expect.any(Number),
      },
      '[MCP] operation=execute_tool',
    );
  });

  it('passes custom integrations to client service with userId', async () => {
    const integration = buildCustom();
    repository.findById.mockResolvedValue(integration);
    contextService.get.mockImplementation((key?: string | symbol) => {
      if (key === 'orgId') return mockOrgId;
      if (key === 'userId') return mockUserId;
      return undefined;
    });
    mcpClientService.callTool.mockResolvedValue({
      isError: false,
      content: {},
    });

    await useCase.execute(buildCommand());

    expect(mcpClientService.callTool).toHaveBeenCalledWith(
      integration,
      {
        toolName: mockToolName,
        parameters: mockParameters,
      },
      mockUserId,
    );
    expect(integration.kind).toBe(McpIntegrationKind.CUSTOM);
  });
});
