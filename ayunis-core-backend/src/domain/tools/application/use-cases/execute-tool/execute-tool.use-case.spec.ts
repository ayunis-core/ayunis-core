import { Test, TestingModule } from '@nestjs/testing';
import { ExecuteToolUseCase } from './execute-tool.use-case';
import { ExecuteToolCommand } from './execute-tool.command';
import { ToolHandlerRegistry } from '../../tool-handler.registry';
import { Tool } from '../../../domain/tool.entity';
import { ToolType } from '../../../domain/value-objects/tool-type.enum';
import { JSONSchema } from 'json-schema-to-ts';
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
}

describe('ExecuteToolUseCase', () => {
  let useCase: ExecuteToolUseCase;
  let mockToolHandlerRegistry: Partial<ToolHandlerRegistry>;
  let mockHandler: { execute: jest.Mock };

  beforeEach(async () => {
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
      const command = new ExecuteToolCommand(mockTool, input);
      const expectedResult = 'Tool execution result';

      mockHandler.execute.mockResolvedValue(expectedResult);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockToolHandlerRegistry.getHandler).toHaveBeenCalledWith(mockTool);
      expect(mockHandler.execute).toHaveBeenCalledWith(mockTool, input);
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
      const command = new ExecuteToolCommand(mockTool, invalidInput);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ToolInvalidInputError,
      );
      expect(mockHandler.execute).not.toHaveBeenCalled();
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
      const command = new ExecuteToolCommand(mockTool, input);

      mockHandler.execute.mockRejectedValue(new Error('Execution failed'));

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ToolExecutionFailedError,
      );
      expect(mockToolHandlerRegistry.getHandler).toHaveBeenCalledWith(mockTool);
      expect(mockHandler.execute).toHaveBeenCalledWith(mockTool, input);
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
      const command = new ExecuteToolCommand(mockTool, input);

      const originalError = new ToolInvalidInputError({
        toolName: 'Test Tool',
        metadata: { errors: [] },
      });
      mockHandler.execute.mockRejectedValue(originalError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(originalError);
      expect(mockToolHandlerRegistry.getHandler).toHaveBeenCalledWith(mockTool);
      expect(mockHandler.execute).toHaveBeenCalledWith(mockTool, input);
    });

    it('should handle tools with no required parameters', async () => {
      // Arrange
      const mockTool = new MockTool('Test Tool', {
        type: 'object',
        properties: {},
      });
      const input = {};
      const command = new ExecuteToolCommand(mockTool, input);
      const expectedResult = 'Tool execution result';

      mockHandler.execute.mockResolvedValue(expectedResult);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockToolHandlerRegistry.getHandler).toHaveBeenCalledWith(mockTool);
      expect(mockHandler.execute).toHaveBeenCalledWith(mockTool, input);
      expect(result).toBe(expectedResult);
    });

    it('should log tool execution', async () => {
      // Arrange
      const mockTool = new MockTool('Test Tool', {
        type: 'object',
        properties: {},
      });
      const input = {};
      const command = new ExecuteToolCommand(mockTool, input);

      const loggerSpy = jest.spyOn(useCase['logger'], 'log');
      mockHandler.execute.mockResolvedValue('result');

      // Act
      await useCase.execute(command);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('execute', 'Test Tool', input);
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
      const command = new ExecuteToolCommand(mockTool, validInput);
      const expectedResult = 'Tool execution result';

      mockHandler.execute.mockResolvedValue(expectedResult);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toBe(expectedResult);
    });
  });
});
