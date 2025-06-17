import { Test, TestingModule } from '@nestjs/testing';
import { CreateToolUseCase } from './create-tool.use-case';
import { CreateHttpToolCommand } from './create-tool.command';
import { ToolConfigRepository } from '../../ports/tool-config.repository';
import { ToolFactory } from '../../tool.factory';
import {
  HttpToolConfig,
  HttpToolMethod,
} from '../../../domain/tools/http-tool.entity';
import { ToolType } from '../../../domain/value-objects/tool-type.enum';
import { UUID } from 'crypto';

describe('CreateToolUseCase', () => {
  let useCase: CreateToolUseCase;
  let mockToolConfigRepository: Partial<ToolConfigRepository>;
  let mockToolFactory: Partial<ToolFactory>;

  beforeEach(async () => {
    mockToolConfigRepository = {
      create: jest.fn(),
    };

    mockToolFactory = {
      createTool: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateToolUseCase,
        { provide: ToolConfigRepository, useValue: mockToolConfigRepository },
        { provide: ToolFactory, useValue: mockToolFactory },
      ],
    }).compile();

    useCase = module.get<CreateToolUseCase>(CreateToolUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should create an HTTP tool successfully', async () => {
      // Arrange
      const userId = 'user-123' as UUID;
      const command = new CreateHttpToolCommand(
        userId,
        'Test Tool',
        'A test HTTP tool',
        'https://api.example.com',
        HttpToolMethod.GET,
        {},
      );

      const savedConfig = new HttpToolConfig({
        displayName: 'Test Tool',
        description: 'A test HTTP tool',
        userId,
        endpointUrl: 'https://api.example.com',
        method: HttpToolMethod.GET,
      });

      const mockTool = { name: 'Test Tool', type: ToolType.HTTP };

      jest
        .spyOn(mockToolConfigRepository, 'create')
        .mockResolvedValue(savedConfig);
      jest
        .spyOn(mockToolFactory, 'createTool')
        .mockReturnValue(mockTool as any);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockToolConfigRepository.create).toHaveBeenCalledWith(
        expect.any(HttpToolConfig),
        userId,
      );
      expect(mockToolFactory.createTool).toHaveBeenCalledWith(
        ToolType.HTTP,
        savedConfig,
      );
      expect(result).toBe(mockTool);
    });

    it('should throw error for unsupported tool type', async () => {
      // Arrange
      const command = { type: 'UNSUPPORTED' } as any;

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        'Unsupported tool type: UNSUPPORTED',
      );
    });
  });
});
