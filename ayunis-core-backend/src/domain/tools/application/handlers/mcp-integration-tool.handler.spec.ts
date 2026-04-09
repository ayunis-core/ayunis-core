import { McpIntegrationToolHandler } from './mcp-integration-tool.handler';
import type { ExecuteMcpToolUseCase } from 'src/domain/mcp/application/use-cases/execute-mcp-tool/execute-mcp-tool.use-case';
import type { McpIntegrationTool } from '../../domain/tools/mcp-integration-tool.entity';
import { McpOAuthAuthorizationRequiredError } from 'src/domain/mcp/application/mcp.errors';
import { ToolExecutionFailedError } from '../tools.errors';
import type { ToolExecutionContext } from '../ports/execution.handler';
import { randomUUID } from 'crypto';

describe('McpIntegrationToolHandler', () => {
  let handler: McpIntegrationToolHandler;
  let executeMcpToolUseCase: jest.Mocked<ExecuteMcpToolUseCase>;

  const mockTool = {
    name: 'test-tool',
    integrationId: randomUUID(),
    validateParams: jest.fn((input) => input),
  } as unknown as McpIntegrationTool;

  const mockContext = {} as ToolExecutionContext;

  beforeEach(() => {
    executeMcpToolUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ExecuteMcpToolUseCase>;

    handler = new McpIntegrationToolHandler(executeMcpToolUseCase);
  });

  it('should propagate McpOAuthAuthorizationRequiredError without wrapping', async () => {
    const oauthError = new McpOAuthAuthorizationRequiredError(
      'test-integration-id',
    );
    executeMcpToolUseCase.execute.mockRejectedValue(oauthError);

    await expect(
      handler.execute({ tool: mockTool, input: {}, context: mockContext }),
    ).rejects.toThrow(McpOAuthAuthorizationRequiredError);

    await expect(
      handler.execute({ tool: mockTool, input: {}, context: mockContext }),
    ).rejects.not.toThrow(ToolExecutionFailedError);
  });

  it('should wrap non-ApplicationError in ToolExecutionFailedError', async () => {
    executeMcpToolUseCase.execute.mockRejectedValue(
      new Error('unexpected error'),
    );

    await expect(
      handler.execute({ tool: mockTool, input: {}, context: mockContext }),
    ).rejects.toThrow(ToolExecutionFailedError);
  });

  it('should return stringified content on success', async () => {
    executeMcpToolUseCase.execute.mockResolvedValue({
      isError: false,
      content: [{ type: 'text', text: 'hello' }],
    });

    const result = await handler.execute({
      tool: mockTool,
      input: {},
      context: mockContext,
    });

    expect(result).toBe(JSON.stringify([{ type: 'text', text: 'hello' }]));
  });
});
