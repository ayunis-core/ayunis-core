import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CreateAssistantMessageUseCase } from './create-assistant-message.use-case';
import type { MessagesRepository } from '../../ports/messages.repository';
import { MESSAGES_REPOSITORY } from '../../ports/messages.repository';
import { CreateAssistantMessageCommand } from './create-assistant-message.command';
import { AssistantMessage } from '../../../domain/messages/assistant-message.entity';
import { TextMessageContent } from '../../../domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from '../../../domain/message-contents/tool-use.message-content.entity';
import { MessageCreationError } from '../../messages.errors';
import { randomUUID } from 'crypto';

describe('CreateAssistantMessageUseCase', () => {
  let useCase: CreateAssistantMessageUseCase;
  let mockMessagesRepository: Partial<MessagesRepository>;

  beforeAll(async () => {
    mockMessagesRepository = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAssistantMessageUseCase,
        { provide: MESSAGES_REPOSITORY, useValue: mockMessagesRepository },
      ],
    }).compile();

    useCase = module.get<CreateAssistantMessageUseCase>(
      CreateAssistantMessageUseCase,
    );
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should create assistant message with text content successfully', async () => {
      // Arrange
      const threadId = randomUUID();
      const content = [new TextMessageContent('Hello! How can I help you?')];
      const command = new CreateAssistantMessageCommand(threadId, content);

      const expectedMessage = new AssistantMessage({
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
        expect.any(AssistantMessage),
      );
      expect(result).toBe(expectedMessage);
    });

    it('should create assistant message with tool use content successfully', async () => {
      // Arrange
      const threadId = randomUUID();
      const content = [
        new TextMessageContent('I will search for that information.'),
        new ToolUseMessageContent(randomUUID(), 'search_tool', {
          query: 'test',
        }),
      ];
      const command = new CreateAssistantMessageCommand(threadId, content);

      const expectedMessage = new AssistantMessage({
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
        expect.any(AssistantMessage),
      );
      expect(result).toBe(expectedMessage);
    });

    it('should create assistant message with mixed content types', async () => {
      // Arrange
      const threadId = randomUUID();
      const content = [
        new TextMessageContent('Let me help you with that.'),
        new ToolUseMessageContent(randomUUID(), 'calculator', {
          expression: '2+2',
        }),
        new TextMessageContent('The calculation is complete.'),
      ];
      const command = new CreateAssistantMessageCommand(threadId, content);

      const expectedMessage = new AssistantMessage({
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
        expect.any(AssistantMessage),
      );
      expect(result).toBe(expectedMessage);
    });

    it('should handle empty content array', async () => {
      // Arrange
      const threadId = randomUUID();
      const content: (TextMessageContent | ToolUseMessageContent)[] = [];
      const command = new CreateAssistantMessageCommand(threadId, content);

      const expectedMessage = new AssistantMessage({
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
        expect.any(AssistantMessage),
      );
      expect(result).toBe(expectedMessage);
    });

    it('should handle repository errors', async () => {
      // Arrange
      const threadId = randomUUID();
      const content = [new TextMessageContent('Hello! How can I help you?')];
      const command = new CreateAssistantMessageCommand(threadId, content);

      const repositoryError = new Error('Database error');
      jest
        .spyOn(mockMessagesRepository, 'create')
        .mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        MessageCreationError,
      );
      expect(mockMessagesRepository.create).toHaveBeenCalledWith(
        expect.any(AssistantMessage),
      );
    });

    it('should handle non-Error repository failures', async () => {
      // Arrange
      const threadId = randomUUID();
      const content = [new TextMessageContent('Hello! How can I help you?')];
      const command = new CreateAssistantMessageCommand(threadId, content);

      jest
        .spyOn(mockMessagesRepository, 'create')
        .mockRejectedValue('String error');

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        MessageCreationError,
      );
      expect(mockMessagesRepository.create).toHaveBeenCalledWith(
        expect.any(AssistantMessage),
      );
    });

    it('should log correct information when creating message', async () => {
      // Arrange
      const threadId = randomUUID();
      const content = [new TextMessageContent('Hello! How can I help you?')];
      const command = new CreateAssistantMessageCommand(threadId, content);

      const expectedMessage = new AssistantMessage({
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
      expect(loggerSpy).toHaveBeenCalledWith('Creating assistant message', {
        threadId,
      });
    });
  });
});
