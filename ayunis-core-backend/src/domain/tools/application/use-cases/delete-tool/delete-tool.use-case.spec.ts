import { Test, TestingModule } from '@nestjs/testing';
import { DeleteToolUseCase } from './delete-tool.use-case';
import { DeleteToolCommand } from './delete-tool.command';
import { ToolConfigRepository } from '../../ports/tool-config.repository';
import { UUID } from 'crypto';

describe('DeleteToolUseCase', () => {
  let useCase: DeleteToolUseCase;
  let mockToolConfigRepository: Partial<ToolConfigRepository>;

  beforeEach(async () => {
    mockToolConfigRepository = {
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteToolUseCase,
        { provide: ToolConfigRepository, useValue: mockToolConfigRepository },
      ],
    }).compile();

    useCase = module.get<DeleteToolUseCase>(DeleteToolUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should delete a tool successfully', async () => {
      // Arrange
      const toolId = '550e8400-e29b-41d4-a716-446655440001' as UUID;
      const ownerId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
      const command = new DeleteToolCommand(toolId, ownerId);

      jest
        .spyOn(mockToolConfigRepository, 'delete')
        .mockResolvedValue(undefined);

      // Act
      await useCase.execute(command);

      // Assert
      expect(mockToolConfigRepository.delete).toHaveBeenCalledWith(
        toolId,
        ownerId,
      );
    });

    it('should handle repository errors', async () => {
      // Arrange
      const toolId = '550e8400-e29b-41d4-a716-446655440001' as UUID;
      const ownerId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
      const command = new DeleteToolCommand(toolId, ownerId);

      jest
        .spyOn(mockToolConfigRepository, 'delete')
        .mockRejectedValue(new Error('Tool not found'));

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Tool not found');
      expect(mockToolConfigRepository.delete).toHaveBeenCalledWith(
        toolId,
        ownerId,
      );
    });

    it('should handle permission errors', async () => {
      // Arrange
      const toolId = '550e8400-e29b-41d4-a716-446655440001' as UUID;
      const ownerId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
      const command = new DeleteToolCommand(toolId, ownerId);

      jest
        .spyOn(mockToolConfigRepository, 'delete')
        .mockRejectedValue(new Error('Access denied'));

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow('Access denied');
      expect(mockToolConfigRepository.delete).toHaveBeenCalledWith(
        toolId,
        ownerId,
      );
    });

    it('should log the deletion attempt', async () => {
      // Arrange
      const toolId = '550e8400-e29b-41d4-a716-446655440001' as UUID;
      const ownerId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
      const command = new DeleteToolCommand(toolId, ownerId);

      const loggerSpy = jest.spyOn(useCase['logger'], 'log');
      jest
        .spyOn(mockToolConfigRepository, 'delete')
        .mockResolvedValue(undefined);

      // Act
      await useCase.execute(command);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('execute', toolId);
    });
  });
});
