import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CreatePromptUseCase } from './create-prompt.use-case';
import { CreatePromptCommand } from './create-prompt.command';
import { PromptsRepository } from '../../ports/prompts.repository';
import { Prompt } from '../../../domain/prompt.entity';
import { PromptCreationError, PromptError } from '../../errors/prompts.errors';

describe('CreatePromptUseCase', () => {
  let useCase: CreatePromptUseCase;
  let promptsRepository: jest.Mocked<PromptsRepository>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as any;

  beforeEach(async () => {
    const mockPromptsRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePromptUseCase,
        { provide: PromptsRepository, useValue: mockPromptsRepository },
      ],
    }).compile();

    useCase = module.get<CreatePromptUseCase>(CreatePromptUseCase);
    promptsRepository = module.get(PromptsRepository);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create a prompt successfully', async () => {
      // Arrange
      const command = new CreatePromptCommand(
        'Test Prompt',
        'This is a test prompt content',
        mockUserId,
      );

      const mockCreatedPrompt = new Prompt({
        title: command.title,
        content: command.content,
        userId: command.userId,
      });

      promptsRepository.create.mockResolvedValue(mockCreatedPrompt);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(promptsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: command.title,
          content: command.content,
          userId: command.userId,
        }),
      );
      expect(result).toBe(mockCreatedPrompt);
    });

    it('should log the execution details', async () => {
      // Arrange
      const command = new CreatePromptCommand(
        'Test Prompt',
        'This is a test prompt content',
        mockUserId,
      );

      const mockCreatedPrompt = new Prompt({
        title: command.title,
        content: command.content,
        userId: command.userId,
      });

      promptsRepository.create.mockResolvedValue(mockCreatedPrompt);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      await useCase.execute(command);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('execute', {
        userId: command.userId,
        title: command.title,
      });
    });

    it('should re-throw PromptError instances', async () => {
      // Arrange
      const command = new CreatePromptCommand(
        'Test Prompt',
        'This is a test prompt content',
        mockUserId,
      );

      class TestPromptError extends PromptError {}
      const promptError = new TestPromptError(
        'Test prompt error',
        0 as any,
        400,
        { userId: mockUserId },
      );
      promptsRepository.create.mockRejectedValue(promptError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(TestPromptError);
      expect(promptsRepository.create).toHaveBeenCalled();
    });

    it('should wrap non-PromptError errors in PromptCreationError', async () => {
      // Arrange
      const command = new CreatePromptCommand(
        'Test Prompt',
        'This is a test prompt content',
        mockUserId,
      );

      const genericError = new Error('Database connection failed');
      promptsRepository.create.mockRejectedValue(genericError);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        PromptCreationError,
      );

      expect(errorSpy).toHaveBeenCalledWith('Failed to create prompt', {
        userId: command.userId,
        title: command.title,
        error: 'Database connection failed',
      });
    });

    it('should handle unknown error types', async () => {
      // Arrange
      const command = new CreatePromptCommand(
        'Test Prompt',
        'This is a test prompt content',
        mockUserId,
      );

      promptsRepository.create.mockRejectedValue('string error');

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        PromptCreationError,
      );

      expect(errorSpy).toHaveBeenCalledWith('Failed to create prompt', {
        userId: command.userId,
        title: command.title,
        error: 'Unknown error',
      });
    });
  });
});
