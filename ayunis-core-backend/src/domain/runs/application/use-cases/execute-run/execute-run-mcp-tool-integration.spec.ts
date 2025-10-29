import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { UUID, randomUUID } from 'crypto';
import { ExecuteRunUseCase } from './execute-run.use-case';
import { ExecuteMcpToolUseCase } from 'src/domain/mcp/application/use-cases/execute-mcp-tool/execute-mcp-tool.use-case';
import { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { LangfuseTraceClient } from 'langfuse';

/**
 * Test suite for MCP tool integration in ExecuteRunUseCase
 *
 * These tests focus on the MCP tool routing and execution logic added in TICKET-029.
 * Full integration tests for the complete run orchestration are in separate files.
 */
describe('ExecuteRunUseCase - MCP Tool Integration', () => {
  let executeRunUseCase: ExecuteRunUseCase;
  let executeMcpToolUseCase: ExecuteMcpToolUseCase;
  let loggerLogSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const mockIntegrationId = randomUUID();
  const mockToolId = 'tool-123';
  const mockToolName = 'test-mcp-tool';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ExecuteRunUseCase,
          useFactory: () => {
            // Create a minimal instance with access to the private methods we're testing
            const instance = Object.create(ExecuteRunUseCase.prototype);
            return instance;
          },
        },
        {
          provide: ExecuteMcpToolUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    executeRunUseCase = module.get<ExecuteRunUseCase>(ExecuteRunUseCase);
    executeMcpToolUseCase = module.get<ExecuteMcpToolUseCase>(
      ExecuteMcpToolUseCase,
    );

    // Inject the mock use case into the instance
    (executeRunUseCase as any).executeMcpToolUseCase = executeMcpToolUseCase;

    // Spy on logger methods
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeMcpTool', () => {
    let mockTrace: Partial<LangfuseTraceClient>;
    let mockSpan: any;

    beforeEach(() => {
      mockSpan = {
        update: jest.fn(),
        end: jest.fn(),
      };
      mockTrace = {
        span: jest.fn().mockReturnValue(mockSpan),
      };
    });

    it('should execute MCP tool successfully and return result', async () => {
      // Arrange
      const tool = new McpIntegrationTool({
        name: mockToolName,
        description: 'MCP test tool',
        parameters: {
          type: 'object',
          properties: { param1: { type: 'string' } },
        },
        integrationId: mockIntegrationId,
      });
      const toolUseContent = new ToolUseMessageContent(
        mockToolId,
        mockToolName,
        { param1: 'test-value' },
      );
      const mockResult = {
        isError: false,
        content: { result: 'success', data: 'test-data' },
      };

      jest
        .spyOn(executeMcpToolUseCase, 'execute')
        .mockResolvedValue(mockResult);

      // Act
      const result = await (executeRunUseCase as any).executeMcpTool(
        tool,
        toolUseContent,
        mockTrace,
      );

      // Assert
      expect(executeMcpToolUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: mockIntegrationId,
          toolName: mockToolName,
          parameters: { param1: 'test-value' },
        }),
      );
      expect(result).toBeInstanceOf(ToolResultMessageContent);
      expect(result.id).toBe(mockToolId);
      expect(result.name).toBe(mockToolName);
      expect(result.content).toContain('success');
      expect(result.content).toContain('test-data');
      expect(loggerLogSpy).toHaveBeenCalledWith(
        'Executing MCP tool',
        expect.objectContaining({
          toolName: mockToolName,
          integrationId: mockIntegrationId,
        }),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        'MCP tool execution succeeded',
        expect.objectContaining({
          toolName: mockToolName,
          integrationId: mockIntegrationId,
        }),
      );
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should return error to LLM when MCP tool execution fails', async () => {
      // Arrange
      const tool = new McpIntegrationTool({
        name: mockToolName,
        description: 'MCP test tool',
        parameters: {
          type: 'object',
          properties: { param1: { type: 'string' } },
        },
        integrationId: mockIntegrationId,
      });
      const toolUseContent = new ToolUseMessageContent(
        mockToolId,
        mockToolName,
        { param1: 'test-value' },
      );
      const mockResult = {
        isError: true,
        content: null,
        errorMessage: 'Tool execution failed: invalid parameter',
      };

      jest
        .spyOn(executeMcpToolUseCase, 'execute')
        .mockResolvedValue(mockResult);

      // Act
      const result = await (executeRunUseCase as any).executeMcpTool(
        tool,
        toolUseContent,
        mockTrace,
      );

      // Assert
      expect(result).toBeInstanceOf(ToolResultMessageContent);
      expect(result.id).toBe(mockToolId);
      expect(result.name).toBe(mockToolName);
      expect(result.content).toBe(
        'MCP tool execution failed: Tool execution failed: invalid parameter',
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'MCP tool execution returned error',
        expect.objectContaining({
          toolName: mockToolName,
          integrationId: mockIntegrationId,
          errorMessage: 'Tool execution failed: invalid parameter',
        }),
      );
      expect(mockSpan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            isError: true,
            error: 'Tool execution failed: invalid parameter',
          }),
        }),
      );
    });

    it('should return error to LLM when MCP tool times out', async () => {
      // Arrange
      const tool = new McpIntegrationTool({
        name: mockToolName,
        description: 'MCP test tool',
        parameters: {
          type: 'object',
          properties: { param1: { type: 'string' } },
        },
        integrationId: mockIntegrationId,
      });
      const toolUseContent = new ToolUseMessageContent(
        mockToolId,
        mockToolName,
        { param1: 'test-value' },
      );

      jest
        .spyOn(executeMcpToolUseCase, 'execute')
        .mockRejectedValue(new Error('Timeout error'));

      // Act
      const result = await (executeRunUseCase as any).executeMcpTool(
        tool,
        toolUseContent,
        mockTrace,
      );

      // Assert
      expect(result).toBeInstanceOf(ToolResultMessageContent);
      expect(result.content).toBe(
        'MCP tool execution failed unexpectedly: Timeout error',
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Unexpected error executing MCP tool',
        expect.objectContaining({
          toolName: mockToolName,
          integrationId: mockIntegrationId,
          error: 'Timeout error',
        }),
      );
    });

    it('should handle missing integration ID in tool metadata', async () => {
      // Arrange
      // Create a mock tool without integrationId by directly creating an object
      const tool = Object.create(McpIntegrationTool.prototype);
      tool.name = mockToolName;
      tool.description = 'MCP test tool';
      tool.parameters = {
        type: 'object',
        properties: { param1: { type: 'string' } },
      };
      tool.type = 'mcp_tool';
      tool.integrationId = undefined; // Simulate missing integrationId
      const toolUseContent = new ToolUseMessageContent(
        mockToolId,
        mockToolName,
        { param1: 'test-value' },
      );

      // Act
      const result = await (executeRunUseCase as any).executeMcpTool(
        tool,
        toolUseContent,
        mockTrace,
      );

      // Assert
      expect(result).toBeInstanceOf(ToolResultMessageContent);
      expect(result.content).toBe(
        'MCP tool configuration error: missing integration ID',
      );
      expect(executeMcpToolUseCase.execute).not.toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'MCP tool missing integrationId',
        expect.objectContaining({
          toolName: mockToolName,
        }),
      );
    });

    it('should log MCP tool executions with correct metadata', async () => {
      // Arrange
      const tool = new McpIntegrationTool({
        name: mockToolName,
        description: 'MCP test tool',
        parameters: {
          type: 'object',
          properties: { param1: { type: 'string' } },
        },
        integrationId: mockIntegrationId,
      });
      const toolUseContent = new ToolUseMessageContent(
        mockToolId,
        mockToolName,
        { param1: 'test-value' },
      );
      const mockResult = {
        isError: false,
        content: 'success',
      };

      jest
        .spyOn(executeMcpToolUseCase, 'execute')
        .mockResolvedValue(mockResult);

      // Act
      await (executeRunUseCase as any).executeMcpTool(
        tool,
        toolUseContent,
        mockTrace,
      );

      // Assert
      expect(mockTrace.span).toHaveBeenCalledWith({
        name: `mcp_tool__${mockToolName}`,
        input: toolUseContent.params,
        metadata: {
          toolName: mockToolName,
          integrationId: mockIntegrationId,
          toolType: 'mcp',
        },
      });
    });

    it('should extract integration ID from tool metadata correctly', async () => {
      // Arrange
      const customIntegrationId = randomUUID();
      const tool = new McpIntegrationTool({
        name: mockToolName,
        description: 'MCP test tool',
        parameters: {
          type: 'object',
          properties: { param1: { type: 'string' } },
        },
        integrationId: customIntegrationId,
      });
      const toolUseContent = new ToolUseMessageContent(
        mockToolId,
        mockToolName,
        { param1: 'test-value' },
      );
      const mockResult = {
        isError: false,
        content: 'success',
      };

      jest
        .spyOn(executeMcpToolUseCase, 'execute')
        .mockResolvedValue(mockResult);

      // Act
      await (executeRunUseCase as any).executeMcpTool(
        tool,
        toolUseContent,
        mockTrace,
      );

      // Assert
      expect(executeMcpToolUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: customIntegrationId,
        }),
      );
    });
  });

  describe('convertToolResultToString', () => {
    it('should return string as-is', () => {
      const result = (executeRunUseCase as any).convertToolResultToString(
        'test string',
      );
      expect(result).toBe('test string');
    });

    it('should convert object to JSON string', () => {
      const obj = { key: 'value', nested: { data: 123 } };
      const result = (executeRunUseCase as any).convertToolResultToString(obj);
      expect(result).toContain('key');
      expect(result).toContain('value');
      expect(result).toContain('nested');
      expect(JSON.parse(result)).toEqual(obj);
    });

    it('should convert number to string', () => {
      const result = (executeRunUseCase as any).convertToolResultToString(42);
      expect(result).toBe('42');
    });

    it('should convert boolean to string', () => {
      const result = (executeRunUseCase as any).convertToolResultToString(true);
      expect(result).toBe('true');
    });

    it('should convert null to string', () => {
      const result = (executeRunUseCase as any).convertToolResultToString(null);
      expect(result).toBe('null');
    });

    it('should convert array to JSON string', () => {
      const arr = [1, 2, 3, 'test'];
      const result = (executeRunUseCase as any).convertToolResultToString(arr);
      expect(JSON.parse(result)).toEqual(arr);
    });
  });
});
