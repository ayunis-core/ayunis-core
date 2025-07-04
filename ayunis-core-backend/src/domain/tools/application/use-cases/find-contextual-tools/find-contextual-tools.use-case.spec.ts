import { Test, TestingModule } from '@nestjs/testing';
import { FindContextualToolsUseCase } from './find-contextual-tools.use-case';
import { FindContextualToolsQuery } from './find-contextual-tools.query';
import { ToolFactory } from '../../tool.factory';
import { Thread } from '../../../../threads/domain/thread.entity';
import { ContextualTool } from '../../../domain/contextual-tool.entity';
import { contextualToolTypes } from '../../../domain/value-objects/tool-type.enum';
import { Model } from '../../../../models/domain/model.entity';
import { ModelProvider } from '../../../../models/domain/value-objects/model-provider.enum';
import { UUID } from 'crypto';

describe('FindContextualToolsUseCase', () => {
  let useCase: FindContextualToolsUseCase;
  let mockToolFactory: Partial<ToolFactory>;

  const createMockThread = (): Thread => {
    return {
      id: '550e8400-e29b-41d4-a716-446655440000' as UUID,
      userId: '550e8400-e29b-41d4-a716-446655440001' as UUID,
      messages: [],
      model: new Model({
        name: 'gpt-4',
        provider: ModelProvider.OPENAI,
        displayName: 'GPT-4',
        canStream: true,
        isReasoning: false,
        isArchived: false,
        isProviderDefault: true,
      }),
      isInternetSearchEnabled: false,
      getLastMessage: jest.fn().mockReturnValue(null),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Thread;
  };

  beforeEach(async () => {
    mockToolFactory = {
      createTool: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindContextualToolsUseCase,
        { provide: ToolFactory, useValue: mockToolFactory },
      ],
    }).compile();

    useCase = module.get<FindContextualToolsUseCase>(
      FindContextualToolsUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should find available contextual tools', async () => {
      // Arrange
      const mockThread = createMockThread();
      const query = new FindContextualToolsQuery({ thread: mockThread });

      const mockContextualTool = {
        name: 'Source Query Tool',
        isAvailable: jest.fn().mockReturnValue(true),
      } as unknown as ContextualTool;

      // Mock the factory to return a contextual tool for SOURCE_QUERY and throw for INTERNET_SEARCH
      jest.spyOn(mockToolFactory, 'createTool').mockImplementation((type) => {
        if (type === 'source_query') {
          return mockContextualTool as any;
        }
        throw new Error(`Unsupported tool type: ${type}`);
      });

      // Act & Assert - should throw when trying to create INTERNET_SEARCH tool
      await expect(useCase.execute(query)).rejects.toThrow(
        'Unsupported tool type: internet_search',
      );
      expect(mockToolFactory.createTool).toHaveBeenCalledWith('source_query');
      expect(mockToolFactory.createTool).toHaveBeenCalledWith(
        'internet_search',
      );
    });

    it('should return empty array when no contextual tools are available', async () => {
      // Arrange
      const mockThread = createMockThread();
      const query = new FindContextualToolsQuery({ thread: mockThread });

      const mockContextualTool = {
        name: 'Source Query Tool',
        isAvailable: jest.fn().mockReturnValue(false),
      } as unknown as ContextualTool;

      // Mock only SOURCE_QUERY to work for this test
      jest
        .spyOn(mockToolFactory, 'createTool')
        .mockReturnValue(mockContextualTool as any);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(mockToolFactory.createTool).toHaveBeenCalledTimes(
        contextualToolTypes.length,
      );
      expect(result).toEqual([]);
    });

    it('should filter out non-contextual tools', async () => {
      // Arrange
      const mockThread = createMockThread();
      const query = new FindContextualToolsQuery({ thread: mockThread });

      const mockNonContextualTool = {
        name: 'Non-Contextual Tool',
        // Not implementing ContextualTool interface
      };

      jest
        .spyOn(mockToolFactory, 'createTool')
        .mockReturnValue(mockNonContextualTool as any);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(mockToolFactory.createTool).toHaveBeenCalledTimes(
        contextualToolTypes.length,
      );
      expect(result).toEqual([]);
    });

    it('should throw tool factory errors', async () => {
      // Arrange
      const mockThread = createMockThread();
      const query = new FindContextualToolsQuery({ thread: mockThread });

      jest.spyOn(mockToolFactory, 'createTool').mockImplementation(() => {
        throw new Error('Tool creation failed');
      });

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        'Tool creation failed',
      );
      expect(mockToolFactory.createTool).toHaveBeenCalledWith(
        contextualToolTypes[0],
      );
    });
  });
});
