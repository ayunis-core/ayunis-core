import { Test, TestingModule } from '@nestjs/testing';
import { RunsController } from './runs.controller';
import { ExecuteRunAndSetTitleUseCase } from '../../application/use-cases/execute-run-and-set-title/execute-run-and-set-title.use-case';
import { RunSessionManager } from './sse/run-session.manager';
import { MessageDtoMapper } from '../../../threads/presenters/http/mappers/message.mapper';
import {
  SendMessageDto,
  TextInput,
  ToolConfigDto,
} from './dto/send-message.dto';
import { ModelProvider } from '../../../models/domain/value-objects/model-provider.object';
import { RunTextInput } from '../../domain/run-input.entity';
import { randomUUID } from 'crypto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Subject } from 'rxjs';
import { MessageResponseDto } from '../../../threads/presenters/http/dto/message-response.dto';
import { ToolType } from '../../../tools/domain/value-objects/tool-type.enum';
import { MessageContentType } from '../../../messages/domain/value-objects/message-content-type.object';
import { MessageRole } from '../../../messages/domain/value-objects/message-role.object';
import { RunInputMapper } from './mappers/run-input.mapper';

// Mock the RunInputMapper static method
jest.mock('./mappers/run-input.mapper', () => ({
  RunInputMapper: {
    toCommand: jest.fn(),
  },
}));

describe('RunsController', () => {
  let controller: RunsController;
  let executeRunAndSetTitleUseCase: ExecuteRunAndSetTitleUseCase;
  let runSessionService: RunSessionManager;
  let messageDtoMapper: MessageDtoMapper;

  beforeEach(async () => {
    const mockExecuteRunAndSetTitleUseCase = {
      execute: jest.fn(),
    };

    const mockRunSessionService = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      closeSession: jest.fn(),
      removeSession: jest.fn(),
      sendMessageToSessions: jest.fn(),
    };

    const mockMessageDtoMapper = {
      toDto: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RunsController],
      providers: [
        {
          provide: ExecuteRunAndSetTitleUseCase,
          useValue: mockExecuteRunAndSetTitleUseCase,
        },
        {
          provide: RunSessionManager,
          useValue: mockRunSessionService,
        },
        {
          provide: MessageDtoMapper,
          useValue: mockMessageDtoMapper,
        },
      ],
    }).compile();

    controller = module.get<RunsController>(RunsController);
    executeRunAndSetTitleUseCase = module.get<ExecuteRunAndSetTitleUseCase>(
      ExecuteRunAndSetTitleUseCase,
    );
    runSessionService = module.get<RunSessionManager>(RunSessionManager);
    messageDtoMapper = module.get<MessageDtoMapper>(MessageDtoMapper);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('connectToStream', () => {
    it('should create a session and return an observable with initial connection event', (done) => {
      // Arrange
      const userId = randomUUID();
      const threadId = randomUUID();
      const mockMessageSubject = new Subject<MessageResponseDto>();
      const mockSession = {
        userId,
        threadId,
        messageSubject: mockMessageSubject,
        createdAt: new Date(),
      };

      (runSessionService.createSession as jest.Mock).mockReturnValue(
        mockSession,
      );

      // Act
      const observable = controller.connectToStream(userId, threadId);

      // Assert
      let eventCount = 0;
      observable.subscribe({
        next: (event) => {
          eventCount++;
          if (eventCount === 1) {
            // First event should be session establishment event
            expect(event.id).toBe('session');
            expect(event.data).toMatchObject({
              type: 'session',
              success: true,
              threadId: threadId,
            });
            expect((event.data as any).timestamp).toBeDefined();
          }
        },
        complete: () => {
          expect(runSessionService.createSession).toHaveBeenCalledWith(
            userId,
            threadId,
          );
          expect(eventCount).toBeGreaterThanOrEqual(1);
          done();
        },
      });

      // Simulate subscription completion
      setTimeout(() => mockMessageSubject.complete(), 10);
    });

    it('should forward messages from session to the stream', (done) => {
      // Arrange
      const userId = randomUUID();
      const threadId = randomUUID();
      const mockMessageSubject = new Subject<any>();
      const mockSession = {
        userId,
        threadId,
        messageSubject: mockMessageSubject,
        createdAt: new Date(),
      };

      const testResponse = {
        type: 'message',
        message: {
          id: 'test-message-id',
          threadId: threadId,
          role: 'assistant' as any,
          content: [{ type: MessageContentType.TEXT, text: 'Hello from AI' }],
          createdAt: new Date().toISOString(),
        },
        threadId: threadId,
        timestamp: new Date().toISOString(),
      };

      (runSessionService.createSession as jest.Mock).mockReturnValue(
        mockSession,
      );

      // Act
      const observable = controller.connectToStream(userId, threadId);

      // Assert
      let eventCount = 0;
      observable.subscribe({
        next: (event) => {
          eventCount++;
          if (eventCount === 2) {
            // Second event should be our test message
            expect(event.id).toBe('test-message-id');
            expect(event.data).toEqual(testResponse);
            done();
          }
        },
      });

      // Simulate sending a message
      setTimeout(() => mockMessageSubject.next(testResponse), 10);
    });

    it('should handle errors gracefully', (done) => {
      // Arrange
      const userId = randomUUID();
      const threadId = randomUUID();

      (runSessionService.createSession as jest.Mock).mockImplementation(() => {
        throw new Error('Session creation failed');
      });

      // Act
      const observable = controller.connectToStream(userId, threadId);

      // Assert
      observable.subscribe({
        error: (error) => {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe('Session creation failed');
          done();
        },
      });
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully when session exists', async () => {
      // Arrange
      const userId = randomUUID();
      const threadId = randomUUID();
      const mockSession = {
        userId,
        threadId,
        messageSubject: new Subject<MessageResponseDto>(),
        createdAt: new Date(),
      };

      const sendMessageDto: SendMessageDto = {
        threadId,
        modelName: 'gpt-4',
        modelProvider: ModelProvider.OPENAI,
        input: {
          type: 'text',
          text: 'Hello, AI!',
        } as TextInput,
        tools: [],
      };

      (runSessionService.getSession as jest.Mock).mockReturnValue(mockSession);
      (runSessionService.sendMessageToSessions as jest.Mock).mockReturnValue(
        true,
      );

      // Mock RunInputMapper
      const mockRunInputMapper =
        require('./mappers/run-input.mapper').RunInputMapper;
      (mockRunInputMapper.toCommand as jest.Mock).mockReturnValue({
        type: 'text',
        text: 'Hello, AI!',
      });

      // Mock the async generator - return an async iterable
      const mockAsyncIterable = {
        async *[Symbol.asyncIterator]() {
          yield { id: '123', content: 'test response' };
        },
      };
      (executeRunAndSetTitleUseCase.execute as jest.Mock).mockResolvedValue(
        mockAsyncIterable,
      );

      // Act
      const result = await controller.sendMessage(sendMessageDto, userId);

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Message sent to session',
      });
      expect(runSessionService.getSession).toHaveBeenCalledWith(
        threadId,
        userId,
      );
    });

    it('should throw HttpException when session not found', async () => {
      // Arrange
      const userId = randomUUID();
      const threadId = randomUUID();
      const sendMessageDto: SendMessageDto = {
        threadId,
        modelName: 'gpt-4',
        modelProvider: ModelProvider.OPENAI,
        input: {
          type: 'text',
          text: 'Hello, AI!',
        } as TextInput,
      };

      (runSessionService.getSession as jest.Mock).mockReturnValue(null);

      // Act & Assert
      await expect(
        controller.sendMessage(sendMessageDto, userId),
      ).rejects.toThrow('Session not found');
    });

    it('should handle input mapping errors', async () => {
      // Arrange
      const userId = randomUUID();
      const threadId = randomUUID();
      const mockSession = {
        userId,
        threadId,
        messageSubject: new Subject<MessageResponseDto>(),
        createdAt: new Date(),
      };

      const sendMessageDto: SendMessageDto = {
        threadId,
        modelName: 'gpt-4',
        modelProvider: ModelProvider.OPENAI,
        input: {
          type: 'text',
          text: 'Hello, AI!',
        } as TextInput,
      };

      (runSessionService.getSession as jest.Mock).mockReturnValue(mockSession);

      // Mock RunInputMapper to throw an error
      const mockRunInputMapper =
        require('./mappers/run-input.mapper').RunInputMapper;
      (mockRunInputMapper.toCommand as jest.Mock).mockImplementation(() => {
        throw new Error('Input mapping failed');
      });

      // Act & Assert
      await expect(
        controller.sendMessage(sendMessageDto, userId),
      ).rejects.toThrow('Failed to send message');
    });

    it('should handle tools configuration', async () => {
      // Arrange
      const userId = randomUUID();
      const threadId = randomUUID();
      const mockSession = {
        userId,
        threadId,
        messageSubject: new Subject<MessageResponseDto>(),
        createdAt: new Date(),
      };

      const tools: ToolConfigDto[] = [
        {
          toolType: 'HTTP' as any,
          toolConfigId: randomUUID(),
        },
      ];

      const sendMessageDto: SendMessageDto = {
        threadId,
        modelName: 'gpt-4',
        modelProvider: ModelProvider.OPENAI,
        input: {
          type: 'text',
          text: 'Hello, AI!',
        } as TextInput,
        tools,
      };

      (runSessionService.getSession as jest.Mock).mockReturnValue(mockSession);
      (runSessionService.sendMessageToSessions as jest.Mock).mockReturnValue(
        true,
      );

      // Mock RunInputMapper
      const mockRunInputMapper =
        require('./mappers/run-input.mapper').RunInputMapper;
      (mockRunInputMapper.toCommand as jest.Mock).mockReturnValue({
        type: 'text',
        text: 'Hello, AI!',
      });

      // Mock the async generator
      const mockAsyncIterable = {
        async *[Symbol.asyncIterator]() {
          yield { id: '123', content: 'test response' };
        },
      };
      (executeRunAndSetTitleUseCase.execute as jest.Mock).mockResolvedValue(
        mockAsyncIterable,
      );

      // Act
      const result = await controller.sendMessage(sendMessageDto, userId);

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Message sent to session',
      });
      expect(executeRunAndSetTitleUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: tools,
        }),
      );
    });
  });
});
