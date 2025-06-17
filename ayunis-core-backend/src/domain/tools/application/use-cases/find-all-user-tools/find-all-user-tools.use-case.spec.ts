import { Test, TestingModule } from '@nestjs/testing';
import { FindAllUserToolsUseCase } from './find-all-user-tools.use-case';
import { FindAllUserToolsQuery } from './find-all-user-tools.query';
import { ToolConfigRepository } from '../../ports/tool-config.repository';
import { ToolFactory } from '../../tool.factory';
import { ToolType } from '../../../domain/value-objects/tool-type.enum';
import { UUID } from 'crypto';

describe('FindAllUserToolsUseCase', () => {
  let useCase: FindAllUserToolsUseCase;
  let mockToolConfigRepository: Partial<ToolConfigRepository>;
  let mockToolFactory: Partial<ToolFactory>;

  beforeEach(async () => {
    mockToolConfigRepository = {
      findAll: jest.fn(),
    };

    mockToolFactory = {
      createTool: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAllUserToolsUseCase,
        { provide: ToolConfigRepository, useValue: mockToolConfigRepository },
        { provide: ToolFactory, useValue: mockToolFactory },
      ],
    }).compile();

    useCase = module.get<FindAllUserToolsUseCase>(FindAllUserToolsUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should find all user tools', async () => {
      // Arrange
      const userId = 'user-123' as UUID;
      const query = new FindAllUserToolsQuery(userId);

      const mockConfigs = [
        {
          id: 'config-1',
          type: ToolType.HTTP,
          displayName: 'HTTP Tool 1',
          userId,
        },
        {
          id: 'config-2',
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
        .spyOn(mockToolConfigRepository, 'findAll')
        .mockResolvedValue(mockConfigs as any);
      jest
        .spyOn(mockToolFactory, 'createTool')
        .mockReturnValueOnce(mockTools[0] as any)
        .mockReturnValueOnce(mockTools[1] as any);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(mockToolConfigRepository.findAll).toHaveBeenCalledWith(userId);
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

    it('should return empty array when user has no tools', async () => {
      // Arrange
      const userId = 'user-123' as UUID;
      const query = new FindAllUserToolsQuery(userId);

      jest.spyOn(mockToolConfigRepository, 'findAll').mockResolvedValue([]);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(mockToolConfigRepository.findAll).toHaveBeenCalledWith(userId);
      expect(mockToolFactory.createTool).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle repository errors', async () => {
      // Arrange
      const userId = 'user-123' as UUID;
      const query = new FindAllUserToolsQuery(userId);

      jest
        .spyOn(mockToolConfigRepository, 'findAll')
        .mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow('Database error');
      expect(mockToolConfigRepository.findAll).toHaveBeenCalledWith(userId);
      expect(mockToolFactory.createTool).not.toHaveBeenCalled();
    });

    it('should handle tool factory errors', async () => {
      // Arrange
      const userId = 'user-123' as UUID;
      const query = new FindAllUserToolsQuery(userId);

      const mockConfigs = [
        {
          id: 'config-1',
          type: ToolType.HTTP,
          displayName: 'HTTP Tool 1',
          userId,
        },
      ];

      jest
        .spyOn(mockToolConfigRepository, 'findAll')
        .mockResolvedValue(mockConfigs as any);
      jest.spyOn(mockToolFactory, 'createTool').mockImplementation(() => {
        throw new Error('Tool creation failed');
      });

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        'Tool creation failed',
      );
      expect(mockToolConfigRepository.findAll).toHaveBeenCalledWith(userId);
      expect(mockToolFactory.createTool).toHaveBeenCalledWith(
        ToolType.HTTP,
        mockConfigs[0],
      );
    });
  });
});
