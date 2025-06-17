import { Test, TestingModule } from '@nestjs/testing';
import { CreateSystemMessageUseCase } from './create-system-message.use-case';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from '../../ports/messages.repository';
import { CreateSystemMessageCommand } from './create-system-message.command';
import { SystemMessage } from '../../../domain/messages/system-message.entity';
import { TextMessageContent } from '../../../domain/message-contents/text.message-content.entity';
import { MessageCreationError } from '../../messages.errors';
import { randomUUID } from 'crypto';

describe('CreateSystemMessageUseCase', () => {
  let useCase: CreateSystemMessageUseCase;
  let mockMessagesRepository: Partial<MessagesRepository>;

  beforeEach(async () => {
    mockMessagesRepository = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSystemMessageUseCase,
        { provide: MESSAGES_REPOSITORY, useValue: mockMessagesRepository },
      ],
    }).compile();

    useCase = module.get<CreateSystemMessageUseCase>(
      CreateSystemMessageUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should create system message successfully', async () => {
      // Arrange
      const threadId = randomUUID();
      const content = [new TextMessageContent('System instruction')];
      const command = new CreateSystemMessageCommand(threadId, content);

      const expectedMessage = new SystemMessage({
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
        expect.any(SystemMessage),
      );
      expect(result).toBe(expectedMessage);
    });

    it('should create system message with multiple text contents', async () => {
      // Arrange
      const threadId = randomUUID();
      const content = [
        new TextMessageContent('You are a helpful assistant.'),
        new TextMessageContent('Please be concise.'),
      ];
      const command = new CreateSystemMessageCommand(threadId, content);

      const expectedMessage = new SystemMessage({
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
        expect.any(SystemMessage),
      );
      expect(result).toBe(expectedMessage);
    });

    it('should handle empty content array', async () => {
      // Arrange
      const threadId = randomUUID();
      const content: TextMessageContent[] = [];
      const command = new CreateSystemMessageCommand(threadId, content);

      const expectedMessage = new SystemMessage({
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
        expect.any(SystemMessage),
      );
      expect(result).toBe(expectedMessage);
    });

    it('should handle repository errors', async () => {
      // Arrange
      const threadId = randomUUID();
      const content = [new TextMessageContent('System instruction')];
      const command = new CreateSystemMessageCommand(threadId, content);

      const repositoryError = new Error('Database error');
      jest
        .spyOn(mockMessagesRepository, 'create')
        .mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        MessageCreationError,
      );
      expect(mockMessagesRepository.create).toHaveBeenCalledWith(
        expect.any(SystemMessage),
      );
    });

    it('should handle non-Error repository failures', async () => {
      // Arrange
      const threadId = randomUUID();
      const content = [new TextMessageContent('System instruction')];
      const command = new CreateSystemMessageCommand(threadId, content);

      jest
        .spyOn(mockMessagesRepository, 'create')
        .mockRejectedValue('String error');

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        MessageCreationError,
      );
      expect(mockMessagesRepository.create).toHaveBeenCalledWith(
        expect.any(SystemMessage),
      );
    });

    it('should log correct information when creating message', async () => {
      // Arrange
      const threadId = randomUUID();
      const content = [new TextMessageContent('System instruction')];
      const command = new CreateSystemMessageCommand(threadId, content);

      const expectedMessage = new SystemMessage({
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
      expect(loggerSpy).toHaveBeenCalledWith('Creating system message', {
        threadId,
      });
    });
  });
});
