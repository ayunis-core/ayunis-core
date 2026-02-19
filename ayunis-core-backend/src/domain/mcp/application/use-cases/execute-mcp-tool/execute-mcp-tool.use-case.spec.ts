import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ExecuteMcpToolUseCase } from './execute-mcp-tool.use-case';
import { ExecuteMcpToolCommand } from './execute-mcp-tool.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpClientService } from '../../services/mcp-client.service';
import { ContextService } from 'src/common/context/services/context.service';
import { ValidateIntegrationAccessService } from '../../services/validate-integration-access.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpIntegrationDisabledError,
  McpUnauthenticatedError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { PredefinedMcpIntegration } from '../../../domain/integrations/predefined-mcp-integration.entity';
import { CustomMcpIntegration } from '../../../domain/integrations/custom-mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { NoAuthMcpIntegrationAuth } from '../../../domain/auth/no-auth-mcp-integration-auth.entity';
import { BearerMcpIntegrationAuth } from '../../../domain/auth/bearer-mcp-integration-auth.entity';
import { McpIntegrationKind } from '../../../domain/value-objects/mcp-integration-kind.enum';

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
  new CustomMcpIntegration({
    id: mockIntegrationId,
    orgId: mockOrgId,
    name: 'Custom Integration',
    serverUrl: 'https://example.com/mcp',
    auth: new BearerMcpIntegrationAuth({ authToken: 'encrypted-token' }),
  });

describe('ExecuteMcpToolUseCase', () => {
  let useCase: ExecuteMcpToolUseCase;
  let repository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let mcpClientService: {
    callTool: jest.Mock;
  };
  let contextService: jest.Mocked<ContextService>;
  let loggerLogSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeAll(async () => {
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
      ],
    }).compile();

    useCase = module.get(ExecuteMcpToolUseCase);

    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
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
    expect(loggerLogSpy).toHaveBeenCalled();
  });

  it('returns error result when MCP client throws', async () => {
    const integration = buildPredefined();
    repository.findById.mockResolvedValue(integration);
    contextService.get.mockReturnValue(mockOrgId);
    mcpClientService.callTool.mockRejectedValue(new Error('tool failed'));

    const result = await useCase.execute(buildCommand());

    expect(result.isError).toBe(true);
    expect(result.errorMessage).toBe('tool failed');
    expect(loggerWarnSpy).toHaveBeenCalled();
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
    expect(loggerErrorSpy).toHaveBeenCalled();
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
