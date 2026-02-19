import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CheckToolCapabilitiesUseCase } from './check-tool-capabilities.use-case';
import { CheckToolCapabilitiesQuery } from './check-tool-capabilities.query';
import { Tool } from '../../../domain/tool.entity';
import { ToolType } from '../../../domain/value-objects/tool-type.enum';
import type { JSONSchema } from 'json-schema-to-ts';

// Mock tool implementation for testing
class MockTool extends Tool {
  constructor(name: string, type: ToolType) {
    super({
      name,
      description: 'Mock tool for testing',
      parameters: {} as JSONSchema,
      type,
    });
  }

  validateParams(params: Record<string, any>): any {
    return params;
  }

  get returnsPii(): boolean {
    return false;
  }
}

describe('CheckToolCapabilitiesUseCase', () => {
  let useCase: CheckToolCapabilitiesUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CheckToolCapabilitiesUseCase],
    }).compile();

    useCase = module.get<CheckToolCapabilitiesUseCase>(
      CheckToolCapabilitiesUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should return capabilities for a tool', () => {
      // Arrange
      const mockTool = new MockTool('Test Tool', ToolType.HTTP);
      const query = new CheckToolCapabilitiesQuery(mockTool);

      // Act
      const result = useCase.execute(query);

      // Assert
      expect(result).toHaveProperty('isDisplayable');
      expect(result).toHaveProperty('isExecutable');
      expect(typeof result.isDisplayable).toBe('boolean');
      expect(typeof result.isExecutable).toBe('boolean');
    });

    it('should call isDisplayable method', () => {
      // Arrange
      const mockTool = new MockTool('Test Tool', ToolType.HTTP);
      const query = new CheckToolCapabilitiesQuery(mockTool);
      const isDisplayableSpy = jest.spyOn(useCase, 'isDisplayable');

      // Act
      useCase.execute(query);

      // Assert
      expect(isDisplayableSpy).toHaveBeenCalledWith(mockTool);
    });

    it('should call isExecutable method', () => {
      // Arrange
      const mockTool = new MockTool('Test Tool', ToolType.HTTP);
      const query = new CheckToolCapabilitiesQuery(mockTool);
      const isExecutableSpy = jest.spyOn(useCase, 'isExecutable');

      // Act
      useCase.execute(query);

      // Assert
      expect(isExecutableSpy).toHaveBeenCalledWith(mockTool);
    });

    it('should return false for isDisplayable (current implementation)', () => {
      // Arrange
      const mockTool = new MockTool('Test Tool', ToolType.HTTP);
      const query = new CheckToolCapabilitiesQuery(mockTool);

      // Act
      const result = useCase.execute(query);

      // Assert
      expect(result.isDisplayable).toBe(false);
    });

    it('should return true for isExecutable (current implementation)', () => {
      // Arrange
      const mockTool = new MockTool('Test Tool', ToolType.HTTP);
      const query = new CheckToolCapabilitiesQuery(mockTool);

      // Act
      const result = useCase.execute(query);

      // Assert
      expect(result.isExecutable).toBe(true);
    });

    it('should handle different tool types', () => {
      // Arrange
      const httpTool = new MockTool('HTTP Tool', ToolType.HTTP);
      const sourceQueryTool = new MockTool(
        'Source Query Tool',
        ToolType.SOURCE_QUERY,
      );

      const httpQuery = new CheckToolCapabilitiesQuery(httpTool);
      const sourceQuery = new CheckToolCapabilitiesQuery(sourceQueryTool);

      // Act
      const httpResult = useCase.execute(httpQuery);
      const sourceResult = useCase.execute(sourceQuery);

      // Assert
      expect(httpResult.isDisplayable).toBe(false);
      expect(httpResult.isExecutable).toBe(true);
      expect(sourceResult.isDisplayable).toBe(false);
      expect(sourceResult.isExecutable).toBe(true);
    });
  });
});
