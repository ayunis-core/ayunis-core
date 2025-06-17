import { Test, TestingModule } from '@nestjs/testing';
import { CreateToolResultMessageUseCase } from './create-tool-result-message.use-case';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from '../../ports/messages.repository';
import { CreateToolResultMessageCommand } from './create-tool-result-message.command';
import { ToolResultMessage } from '../../../domain/messages/tool-result-message.entity';
import { ToolResultMessageContent } from '../../../domain/message-contents/tool-result.message-content.entity';
import { MessageCreationError } from '../../messages.errors';
import { randomUUID } from 'crypto';

describe('CreateToolResultMessageUseCase', () => {
  let useCase: CreateToolResultMessageUseCase;
  let mockMessagesRepository: Partial<MessagesRepository>;

  beforeEach(async () => {
    mockMessagesRepository = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateToolResultMessageUseCase,
        { provide: MESSAGES_REPOSITORY, useValue: mockMessagesRepository },
      ],
    }).compile();

    useCase = module.get<CreateToolResultMessageUseCase>(
      CreateToolResultMessageUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should create tool result message successfully', async () => {
      // Arrange
      const threadId = randomUUID();
      const toolId = randomUUID();
      const content = [
        new ToolResultMessageContent(
          toolId,
          'search_tool',
          'Search completed successfully',
        ),
      ];
      const command = new CreateToolResultMessageCommand(threadId, content);

      const expectedMessage = new ToolResultMessage({
        threadId,
        content,
      });
      jest
        .spyOn(mockMessagesRepository, 'create')
        .mockResolvedValue(expectedMessage);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockMessagesRepository.create).toHaveBeenCalledWith(
        expect.any(ToolResultMessage),
      );
      expect(result).toBe(expectedMessage);
    });

    it('should create tool result message with multiple tool results', async () => {
      // Arrange
      const threadId = randomUUID();
      const toolId1 = randomUUID();
      const toolId2 = randomUUID();
      const content = [
        new ToolResultMessageContent(toolId1, 'search_tool', 'Search result 1'),
        new ToolResultMessageContent(toolId2, 'calculator', 'Result: 42'),
      ];
      const command = new CreateToolResultMessageCommand(threadId, content);

      const expectedMessage = new ToolResultMessage({
        threadId,
        content,
      });
      jest
        .spyOn(mockMessagesRepository, 'create')
        .mockResolvedValue(expectedMessage);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockMessagesRepository.create).toHaveBeenCalledWith(
        expect.any(ToolResultMessage),
      );
      expect(result).toBe(expectedMessage);
    });

    it('should handle tool result with error message', async () => {
      // Arrange
      const threadId = randomUUID();
      const toolId = randomUUID();
      const content = [
        new ToolResultMessageContent(
          toolId,
          'api_tool',
          'Error: API request failed',
        ),
      ];
      const command = new CreateToolResultMessageCommand(threadId, content);

      const expectedMessage = new ToolResultMessage({
        threadId,
        content,
      });
      jest
        .spyOn(mockMessagesRepository, 'create')
        .mockResolvedValue(expectedMessage);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockMessagesRepository.create).toHaveBeenCalledWith(
        expect.any(ToolResultMessage),
      );
      expect(result).toBe(expectedMessage);
    });

    it('should handle empty content array', async () => {
      // Arrange
      const threadId = randomUUID();
      const content: ToolResultMessageContent[] = [];
      const command = new CreateToolResultMessageCommand(threadId, content);

      const expectedMessage = new ToolResultMessage({
        threadId,
        content,
      });
      jest
        .spyOn(mockMessagesRepository, 'create')
        .mockResolvedValue(expectedMessage);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockMessagesRepository.create).toHaveBeenCalledWith(
        expect.any(ToolResultMessage),
      );
      expect(result).toBe(expectedMessage);
    });

    it('should handle repository errors', async () => {
      // Arrange
      const threadId = randomUUID();
      const toolId = randomUUID();
      const content = [
        new ToolResultMessageContent(
          toolId,
          'search_tool',
          'Search completed successfully',
        ),
      ];
      const command = new CreateToolResultMessageCommand(threadId, content);

      const repositoryError = new Error('Database error');
      jest
        .spyOn(mockMessagesRepository, 'create')
        .mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        MessageCreationError,
      );
      expect(mockMessagesRepository.create).toHaveBeenCalledWith(
        expect.any(ToolResultMessage),
      );
    });

    it('should handle non-Error repository failures', async () => {
      // Arrange
      const threadId = randomUUID();
      const toolId = randomUUID();
      const content = [
        new ToolResultMessageContent(
          toolId,
          'search_tool',
          'Search completed successfully',
        ),
      ];
      const command = new CreateToolResultMessageCommand(threadId, content);

      jest
        .spyOn(mockMessagesRepository, 'create')
        .mockRejectedValue('String error');

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        MessageCreationError,
      );
      expect(mockMessagesRepository.create).toHaveBeenCalledWith(
        expect.any(ToolResultMessage),
      );
    });

    it('should log correct information when creating message', async () => {
      // Arrange
      const threadId = randomUUID();
      const toolId = randomUUID();
      const content = [
        new ToolResultMessageContent(
          toolId,
          'search_tool',
          'Search completed successfully',
        ),
      ];
      const command = new CreateToolResultMessageCommand(threadId, content);

      const expectedMessage = new ToolResultMessage({
        threadId,
        content,
      });
      jest
        .spyOn(mockMessagesRepository, 'create')
        .mockResolvedValue(expectedMessage);

      const loggerSpy = jest.spyOn(useCase['logger'], 'log');

      // Act
      await useCase.execute(command);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Creating tool result message', {
        threadId,
      });
    });
  });
});
