import { Test, TestingModule } from '@nestjs/testing';
import { FindManyToolsUseCase } from './find-many-tools.use-case';
import { FindManyToolsQuery } from './find-many-tools.query';
import { ToolConfigRepository } from '../../ports/tool-config.repository';
import { ToolFactory } from '../../tool.factory';
import { ToolType } from '../../../domain/value-objects/tool-type.enum';
import { UUID } from 'crypto';
import { ToolConfig } from '../../../domain/tool-config.entity';
import { Tool } from '../../../domain/tool.entity';

describe('FindManyToolsUseCase', () => {
  let useCase: FindManyToolsUseCase;
  let mockToolConfigRepository: Partial<ToolConfigRepository>;
  let mockToolFactory: Partial<ToolFactory>;

  beforeEach(async () => {
    mockToolConfigRepository = {
      findMany: jest.fn(),
    };

    mockToolFactory = {
      createTool: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindManyToolsUseCase,
        { provide: ToolConfigRepository, useValue: mockToolConfigRepository },
        { provide: ToolFactory, useValue: mockToolFactory },
      ],
    }).compile();

    useCase = module.get<FindManyToolsUseCase>(FindManyToolsUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should find many tools', async () => {
      // Arrange
      const toolIds = [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
      ] as UUID[];
      const userId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
      const query = new FindManyToolsQuery(toolIds, userId);

      const mockConfigs = [
        {
          id: toolIds[0],
          type: ToolType.HTTP,
          displayName: 'HTTP Tool 1',
          userId,
        },
        {
          id: toolIds[1],
          type: ToolType.HTTP,
          displayName: 'HTTP Tool 2',
          userId,
        },
      ];

      const mockTools = [
        { name: 'HTTP Tool 1', type: ToolType.HTTP },
        { name: 'HTTP Tool 2', type: ToolType.HTTP },
      ];

      jest
        .spyOn(mockToolConfigRepository, 'findMany')
        .mockResolvedValue(mockConfigs as unknown as ToolConfig[]);
      jest
        .spyOn(mockToolFactory, 'createTool')
        .mockReturnValueOnce(mockTools[0] as unknown as Tool)
        .mockReturnValueOnce(mockTools[1] as unknown as Tool);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(mockToolConfigRepository.findMany).toHaveBeenCalledWith(
        toolIds,
        userId,
      );
      expect(mockToolFactory.createTool).toHaveBeenCalledTimes(2);
      expect(mockToolFactory.createTool).toHaveBeenNthCalledWith(
        1,
        ToolType.HTTP,
        mockConfigs[0],
      );
      expect(mockToolFactory.createTool).toHaveBeenNthCalledWith(
        2,
        ToolType.HTTP,
        mockConfigs[1],
      );
      expect(result).toEqual(mockTools);
    });

    it('should return empty array when no tools found', async () => {
      // Arrange
      const toolIds = [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
      ] as UUID[];
      const userId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
      const query = new FindManyToolsQuery(toolIds, userId);

      jest.spyOn(mockToolConfigRepository, 'findMany').mockResolvedValue([]);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(mockToolConfigRepository.findMany).toHaveBeenCalledWith(
        toolIds,
        userId,
      );
      expect(mockToolFactory.createTool).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle partial results when some tools not found', async () => {
      // Arrange
      const toolIds = [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
      ] as UUID[];
      const userId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
      const query = new FindManyToolsQuery(toolIds, userId);

      const mockConfigs = [
        {
          id: toolIds[0],
          type: ToolType.HTTP,
          displayName: 'HTTP Tool 1',
          userId,
        },
        // tool-2 not found
      ];

      const mockTools = [{ name: 'HTTP Tool 1', type: ToolType.HTTP }];

      jest
        .spyOn(mockToolConfigRepository, 'findMany')
        .mockResolvedValue(mockConfigs as unknown as ToolConfig[]);
      jest
        .spyOn(mockToolFactory, 'createTool')
        .mockReturnValueOnce(mockTools[0] as unknown as Tool);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(mockToolConfigRepository.findMany).toHaveBeenCalledWith(
        toolIds,
        userId,
      );
      expect(mockToolFactory.createTool).toHaveBeenCalledTimes(1);
      expect(mockToolFactory.createTool).toHaveBeenCalledWith(
        ToolType.HTTP,
        mockConfigs[0],
      );
      expect(result).toEqual(mockTools);
    });

    it('should handle repository errors', async () => {
      // Arrange
      const toolIds = [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
      ] as UUID[];
      const userId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
      const query = new FindManyToolsQuery(toolIds, userId);

      jest
        .spyOn(mockToolConfigRepository, 'findMany')
        .mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow('Database error');
      expect(mockToolConfigRepository.findMany).toHaveBeenCalledWith(
        toolIds,
        userId,
      );
      expect(mockToolFactory.createTool).not.toHaveBeenCalled();
    });

    it('should handle tool factory errors', async () => {
      // Arrange
      const toolIds = ['550e8400-e29b-41d4-a716-446655440001'] as UUID[];
      const userId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
      const query = new FindManyToolsQuery(toolIds, userId);

      const mockConfigs = [
        {
          id: toolIds[0],
          type: ToolType.HTTP,
          displayName: 'HTTP Tool 1',
          userId,
        },
      ];

      jest
        .spyOn(mockToolConfigRepository, 'findMany')
        .mockResolvedValue(mockConfigs as unknown as ToolConfig[]);
      jest.spyOn(mockToolFactory, 'createTool').mockImplementation(() => {
        throw new Error('Tool creation failed');
      });

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        'Tool creation failed',
      );
      expect(mockToolConfigRepository.findMany).toHaveBeenCalledWith(
        toolIds,
        userId,
      );
      expect(mockToolFactory.createTool).toHaveBeenCalledWith(
        ToolType.HTTP,
        mockConfigs[0],
      );
    });
  });
});
