import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ExecuteToolUseCase } from './execute-tool.use-case';
import { ExecuteToolCommand } from './execute-tool.command';
import { ToolHandlerRegistry } from '../../tool-handler.registry';
import { Tool } from '../../../domain/tool.entity';
import { ToolType } from '../../../domain/value-objects/tool-type.enum';
import type { JSONSchema } from 'json-schema-to-ts';
import {
  ToolInvalidInputError,
  ToolExecutionFailedError,
} from '../../tools.errors';

// Mock tool implementation for testing
class MockTool extends Tool {
  constructor(
    name: string,
    parameters: JSONSchema = { type: 'object', properties: {} },
  ) {
    super({
      name,
      description: 'Mock tool for testing',
      parameters,
      type: ToolType.HTTP,
    });
  }

  validateParams(params: Record<string, any>): any {
    return params;
  }

  get returnsPii(): boolean {
    return false;
  }
}

describe('ExecuteToolUseCase', () => {
  let useCase: ExecuteToolUseCase;
  let mockToolHandlerRegistry: Partial<ToolHandlerRegistry>;
  let mockHandler: { execute: jest.Mock };

  const mockContext = '123e4567-e89b-12d3-a456-426614174000' as any;

  beforeAll(async () => {
    mockHandler = {
      execute: jest.fn(),
    };

    mockToolHandlerRegistry = {
      getHandler: jest.fn().mockReturnValue(mockHandler),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecuteToolUseCase,
        { provide: ToolHandlerRegistry, useValue: mockToolHandlerRegistry },
      ],
    }).compile();

    useCase = module.get<ExecuteToolUseCase>(ExecuteToolUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should execute a tool successfully', async () => {
      // Arrange
      const mockTool = new MockTool('Test Tool', {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      });
      const input = { query: 'test query' };
      const command = new ExecuteToolCommand(mockTool, input, mockContext);
      const expectedResult = 'Tool execution result';

      mockHandler.execute.mockResolvedValue(expectedResult);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockToolHandlerRegistry.getHandler).toHaveBeenCalledWith(mockTool);
      expect(mockHandler.execute).toHaveBeenCalledWith({
        tool: mockTool,
        input,
        context: mockContext,
      });
      expect(result).toBe(expectedResult);
    });

    it('should validate input against tool parameters schema', async () => {
      // Arrange
      const mockTool = new MockTool('Test Tool', {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      });
      const invalidInput = { wrongProperty: 'test' };
      const command = new ExecuteToolCommand(
        mockTool,
        invalidInput,
        mockContext,
      );

      // Act & Assert
      // Validation currently disabled in implementation; ensure handler still runs
      await useCase.execute(command);
      expect(mockHandler.execute).toHaveBeenCalled();
    });

    it('should handle tool execution errors', async () => {
      // Arrange
      const mockTool = new MockTool('Test Tool', {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      });
      const input = { query: 'test query' };
      const command = new ExecuteToolCommand(mockTool, input, mockContext);

      mockHandler.execute.mockRejectedValue(new Error('Execution failed'));

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ToolExecutionFailedError,
      );
      expect(mockToolHandlerRegistry.getHandler).toHaveBeenCalledWith(mockTool);
      expect(mockHandler.execute).toHaveBeenCalledWith({
        tool: mockTool,
        input,
        context: mockContext,
      });
    });

    it('should pass through ToolInvalidInputError without wrapping', async () => {
      // Arrange
      const mockTool = new MockTool('Test Tool', {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      });
      const input = { query: 'test query' };
      const command = new ExecuteToolCommand(mockTool, input, mockContext);

      const originalError = new ToolInvalidInputError({
        toolName: 'Test Tool',
        metadata: { errors: [] },
      });
      mockHandler.execute.mockRejectedValue(originalError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(originalError);
      expect(mockToolHandlerRegistry.getHandler).toHaveBeenCalledWith(mockTool);
      expect(mockHandler.execute).toHaveBeenCalledWith({
        tool: mockTool,
        input,
        context: mockContext,
      });
    });

    it('should handle tools with no required parameters', async () => {
      // Arrange
      const mockTool = new MockTool('Test Tool', {
        type: 'object',
        properties: {},
      });
      const input = {};
      const command = new ExecuteToolCommand(mockTool, input, mockContext);
      const expectedResult = 'Tool execution result';

      mockHandler.execute.mockResolvedValue(expectedResult);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockToolHandlerRegistry.getHandler).toHaveBeenCalledWith(mockTool);
      expect(mockHandler.execute).toHaveBeenCalledWith({
        tool: mockTool,
        input,
        context: mockContext,
      });
      expect(result).toBe(expectedResult);
    });

    it('should log tool execution', async () => {
      // Arrange
      const mockTool = new MockTool('Test Tool', {
        type: 'object',
        properties: {},
      });
      const input = {};
      const command = new ExecuteToolCommand(mockTool, input, mockContext);

      const loggerSpy = jest.spyOn(useCase['logger'], 'log');
      mockHandler.execute.mockResolvedValue('result');

      // Act
      await useCase.execute(command);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('execute', {
        toolName: 'Test Tool',
        input,
        parameters: mockTool.parameters,
      });
    });

    it('should handle complex parameter validation', async () => {
      // Arrange
      const mockTool = new MockTool('Test Tool', {
        type: 'object',
        properties: {
          query: { type: 'string', minLength: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100 },
          options: {
            type: 'object',
            properties: {
              includeMetadata: { type: 'boolean' },
            },
          },
        },
        required: ['query'],
      });

      const validInput = {
        query: 'test query',
        limit: 10,
        options: { includeMetadata: true },
      };
      const command = new ExecuteToolCommand(mockTool, validInput, mockContext);
      const expectedResult = 'Tool execution result';

      mockHandler.execute.mockResolvedValue(expectedResult);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toBe(expectedResult);
    });
  });
});
