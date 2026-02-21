import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CreateUserMessageUseCase } from './create-user-message.use-case';
import type { MessagesRepository } from '../../ports/messages.repository';
import { MESSAGES_REPOSITORY } from '../../ports/messages.repository';
import type { ImageUploadData } from './create-user-message.command';
import { CreateUserMessageCommand } from './create-user-message.command';
import { UserMessage } from '../../../domain/messages/user-message.entity';
import { MessageCreationError } from '../../messages.errors';
import { randomUUID } from 'crypto';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedException } from '@nestjs/common';

describe('CreateUserMessageUseCase', () => {
  let useCase: CreateUserMessageUseCase;
  let mockMessagesRepository: Partial<MessagesRepository>;
  let mockUploadObjectUseCase: Partial<UploadObjectUseCase>;
  let mockDeleteObjectUseCase: Partial<DeleteObjectUseCase>;
  let mockContextService: Partial<ContextService>;

  const mockOrgId = randomUUID();

  beforeAll(async () => {
    mockMessagesRepository = {
      create: jest.fn(),
    };

    mockUploadObjectUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    mockDeleteObjectUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    mockContextService = {
      get: jest.fn().mockReturnValue(mockOrgId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserMessageUseCase,
        { provide: MESSAGES_REPOSITORY, useValue: mockMessagesRepository },
        { provide: UploadObjectUseCase, useValue: mockUploadObjectUseCase },
        { provide: DeleteObjectUseCase, useValue: mockDeleteObjectUseCase },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<CreateUserMessageUseCase>(CreateUserMessageUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    (mockContextService.get as jest.Mock).mockReturnValue(mockOrgId);
    (mockUploadObjectUseCase.execute as jest.Mock).mockResolvedValue(undefined);
    (mockDeleteObjectUseCase.execute as jest.Mock).mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should create user message with text successfully', async () => {
      // Arrange
      const threadId = randomUUID();
      const text = 'Hello world';
      const command = new CreateUserMessageCommand(threadId, text);

      const expectedMessage = new UserMessage({
        threadId,
        content: [],
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

    it('should create user message with image successfully', async () => {
      // Arrange
      const threadId = randomUUID();
      const text = 'Check this image';
      const pendingImage: ImageUploadData = {
        buffer: Buffer.from('fake-image-data'),
        contentType: 'image/jpeg',
        altText: 'alt text',
      };
      const command = new CreateUserMessageCommand(threadId, text, [
        pendingImage,
      ]);

      const expectedMessage = new UserMessage({
        threadId,
        content: [],
      });
      jest
        .spyOn(mockMessagesRepository, 'create')
        .mockResolvedValue(expectedMessage);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockUploadObjectUseCase.execute).toHaveBeenCalledTimes(1);
      expect(mockMessagesRepository.create).toHaveBeenCalledWith(
        expect.any(UserMessage),
      );
      expect(result).toBe(expectedMessage);
    });

    it('should create user message with multiple images', async () => {
      // Arrange
      const threadId = randomUUID();
      const text = 'Multiple images';
      const pendingImages: ImageUploadData[] = [
        {
          buffer: Buffer.from('image-1'),
          contentType: 'image/jpeg',
        },
        {
          buffer: Buffer.from('image-2'),
          contentType: 'image/png',
          altText: 'second image',
        },
      ];
      const command = new CreateUserMessageCommand(
        threadId,
        text,
        pendingImages,
      );

      const expectedMessage = new UserMessage({
        threadId,
        content: [],
      });
      jest
        .spyOn(mockMessagesRepository, 'create')
        .mockResolvedValue(expectedMessage);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockUploadObjectUseCase.execute).toHaveBeenCalledTimes(2);
      expect(mockMessagesRepository.create).toHaveBeenCalledWith(
        expect.any(UserMessage),
      );
      expect(result).toBe(expectedMessage);
    });

    it('should throw UnauthorizedException when org context is missing', async () => {
      // Arrange
      const threadId = randomUUID();
      const command = new CreateUserMessageCommand(threadId, 'Hello');

      jest.spyOn(mockContextService, 'get').mockReturnValue(undefined);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should cleanup uploaded images on repository error', async () => {
      // Arrange
      const threadId = randomUUID();
      const pendingImage: ImageUploadData = {
        buffer: Buffer.from('fake-image'),
        contentType: 'image/jpeg',
      };
      const command = new CreateUserMessageCommand(threadId, 'Test', [
        pendingImage,
      ]);

      const repositoryError = new Error('Database error');
      jest
        .spyOn(mockMessagesRepository, 'create')
        .mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        MessageCreationError,
      );
      expect(mockUploadObjectUseCase.execute).toHaveBeenCalledTimes(1);
      expect(mockDeleteObjectUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle repository errors', async () => {
      // Arrange
      const threadId = randomUUID();
      const command = new CreateUserMessageCommand(threadId, 'Hello world');

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
      const command = new CreateUserMessageCommand(threadId, 'Hello world');

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
      const text = 'Hello world';
      const command = new CreateUserMessageCommand(threadId, text);

      const expectedMessage = new UserMessage({
        threadId,
        content: [],
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
        hasText: true,
        imageCount: 0,
      });
    });

    it('should log correct information when creating message with images', async () => {
      // Arrange
      const threadId = randomUUID();
      const text = 'With image';
      const pendingImage: ImageUploadData = {
        buffer: Buffer.from('image'),
        contentType: 'image/png',
      };
      const command = new CreateUserMessageCommand(threadId, text, [
        pendingImage,
      ]);

      const expectedMessage = new UserMessage({
        threadId,
        content: [],
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
        hasText: true,
        imageCount: 1,
      });
    });
  });
});
