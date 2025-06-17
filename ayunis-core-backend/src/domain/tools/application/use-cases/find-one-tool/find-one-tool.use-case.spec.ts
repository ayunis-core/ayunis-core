import { Test, TestingModule } from '@nestjs/testing';
import { FindOneToolUseCase } from './find-one-tool.use-case';
import {
  FindOneToolQuery,
  FindOneConfigurableToolQuery,
} from './find-one-tool.query';
import { ToolConfigRepository } from '../../ports/tool-config.repository';
import { ToolFactory } from '../../tool.factory';
import { ToolType } from '../../../domain/value-objects/tool-type.enum';
import { UUID } from 'crypto';

describe('FindOneToolUseCase', () => {
  let useCase: FindOneToolUseCase;
  let mockToolConfigRepository: Partial<ToolConfigRepository>;
  let mockToolFactory: Partial<ToolFactory>;

  beforeEach(async () => {
    mockToolConfigRepository = {
      findOne: jest.fn(),
    };

    mockToolFactory = {
      createTool: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindOneToolUseCase,
        { provide: ToolConfigRepository, useValue: mockToolConfigRepository },
        { provide: ToolFactory, useValue: mockToolFactory },
      ],
    }).compile();

    useCase = module.get<FindOneToolUseCase>(FindOneToolUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should find a non-configurable tool', async () => {
      // Arrange
      const query = new FindOneToolQuery({ type: ToolType.INTERNET_SEARCH });
      const mockTool = {
        name: 'Internet Search',
        type: ToolType.INTERNET_SEARCH,
      };

      jest
        .spyOn(mockToolFactory, 'createTool')
        .mockReturnValue(mockTool as any);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(mockToolFactory.createTool).toHaveBeenCalledWith(
        ToolType.INTERNET_SEARCH,
      );
      expect(mockToolConfigRepository.findOne).not.toHaveBeenCalled();
      expect(result).toBe(mockTool);
    });

    it('should find a configurable tool', async () => {
      // Arrange
      const configId = 'config-123' as UUID;
      const userId = 'user-456' as UUID;
      const query = new FindOneConfigurableToolQuery({
        type: ToolType.HTTP,
        configId,
        userId,
      });

      const mockConfig = {
        id: configId,
        type: ToolType.HTTP,
        displayName: 'Test HTTP Tool',
        userId,
      };
      const mockTool = { name: 'Test HTTP Tool', type: ToolType.HTTP };

      jest
        .spyOn(mockToolConfigRepository, 'findOne')
        .mockResolvedValue(mockConfig as any);
      jest
        .spyOn(mockToolFactory, 'createTool')
        .mockReturnValue(mockTool as any);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(mockToolConfigRepository.findOne).toHaveBeenCalledWith(
        configId,
        userId,
      );
      expect(mockToolFactory.createTool).toHaveBeenCalledWith(
        ToolType.HTTP,
        mockConfig,
      );
      expect(result).toBe(mockTool);
    });

    it('should handle repository errors for configurable tools', async () => {
      // Arrange
      const configId = 'config-123' as UUID;
      const userId = 'user-456' as UUID;
      const query = new FindOneConfigurableToolQuery({
        type: ToolType.HTTP,
        configId,
        userId,
      });

      jest
        .spyOn(mockToolConfigRepository, 'findOne')
        .mockRejectedValue(new Error('Config not found'));

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow('Config not found');
      expect(mockToolConfigRepository.findOne).toHaveBeenCalledWith(
        configId,
        userId,
      );
      expect(mockToolFactory.createTool).not.toHaveBeenCalled();
    });

    it('should handle tool factory errors', async () => {
      // Arrange
      const query = new FindOneToolQuery({ type: ToolType.INTERNET_SEARCH });

      jest.spyOn(mockToolFactory, 'createTool').mockImplementation(() => {
        throw new Error('Tool creation failed');
      });

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        'Tool creation failed',
      );
      expect(mockToolFactory.createTool).toHaveBeenCalledWith(
        ToolType.INTERNET_SEARCH,
      );
    });
  });
});
