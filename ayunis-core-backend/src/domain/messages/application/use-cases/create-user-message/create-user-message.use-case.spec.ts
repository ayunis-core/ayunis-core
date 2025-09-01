import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserMessageUseCase } from './create-user-message.use-case';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from '../../ports/messages.repository';
import { CreateUserMessageCommand } from './create-user-message.command';
import { UserMessage } from '../../../domain/messages/user-message.entity';
import { TextMessageContent } from '../../../domain/message-contents/text-message-content.entity';
import { MessageCreationError } from '../../messages.errors';
import { randomUUID } from 'crypto';

describe('CreateUserMessageUseCase', () => {
  let useCase: CreateUserMessageUseCase;
  let mockMessagesRepository: Partial<MessagesRepository>;

  beforeEach(async () => {
    mockMessagesRepository = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserMessageUseCase,
        { provide: MESSAGES_REPOSITORY, useValue: mockMessagesRepository },
      ],
    }).compile();

    useCase = module.get<CreateUserMessageUseCase>(CreateUserMessageUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should create user message successfully', async () => {
      // Arrange
      const threadId = randomUUID();
      const content = [new TextMessageContent('Hello world')];
      const command = new CreateUserMessageCommand(threadId, content);

      const expectedMessage = new UserMessage({
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
        expect.any(UserMessage),
      );
      expect(result).toBe(expectedMessage);
    });

    it('should create user message with multiple text contents', async () => {
      // Arrange
      const threadId = randomUUID();
      const content = [
        new TextMessageContent('Hello'),
        new TextMessageContent('World'),
      ];
      const command = new CreateUserMessageCommand(threadId, content);

      const expectedMessage = new UserMessage({
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
        expect.any(UserMessage),
      );
      expect(result).toBe(expectedMessage);
    });

    it('should handle empty content array', async () => {
      // Arrange
      const threadId = randomUUID();
      const content: TextMessageContent[] = [];
      const command = new CreateUserMessageCommand(threadId, content);

      const expectedMessage = new UserMessage({
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
        expect.any(UserMessage),
      );
      expect(result).toBe(expectedMessage);
    });

    it('should handle repository errors', async () => {
      // Arrange
      const threadId = randomUUID();
      const content = [new TextMessageContent('Hello world')];
      const command = new CreateUserMessageCommand(threadId, content);

      const repositoryError = new Error('Database error');
      jest
        .spyOn(mockMessagesRepository, 'create')
        .mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        MessageCreationError,
      );
      expect(mockMessagesRepository.create).toHaveBeenCalledWith(
        expect.any(UserMessage),
      );
    });

    it('should handle non-Error repository failures', async () => {
      // Arrange
      const threadId = randomUUID();
      const content = [new TextMessageContent('Hello world')];
      const command = new CreateUserMessageCommand(threadId, content);

      jest
        .spyOn(mockMessagesRepository, 'create')
        .mockRejectedValue('String error');

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        MessageCreationError,
      );
      expect(mockMessagesRepository.create).toHaveBeenCalledWith(
        expect.any(UserMessage),
      );
    });

    it('should log correct information when creating message', async () => {
      // Arrange
      const threadId = randomUUID();
      const content = [new TextMessageContent('Hello world')];
      const command = new CreateUserMessageCommand(threadId, content);

      const expectedMessage = new UserMessage({
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
      expect(loggerSpy).toHaveBeenCalledWith('Creating user message', {
        threadId,
      });
    });
  });
});
