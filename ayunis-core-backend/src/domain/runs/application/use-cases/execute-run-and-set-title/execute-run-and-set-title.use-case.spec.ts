import { Test, TestingModule } from '@nestjs/testing';
import { ExecuteRunAndSetTitleUseCase } from './execute-run-and-set-title.use-case';
import { ExecuteRunAndSetTitleCommand } from './execute-run-and-set-title.command';
import { ExecuteRunUseCase } from '../execute-run/execute-run.use-case';
import { FindThreadUseCase } from '../../../../threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from '../../../../threads/application/use-cases/find-thread/find-thread.query';
import { GenerateAndSetThreadTitleUseCase } from '../../../../threads/application/use-cases/generate-and-set-thread-title/generate-and-set-thread-title.use-case';
import { GenerateAndSetThreadTitleCommand } from '../../../../threads/application/use-cases/generate-and-set-thread-title/generate-and-set-thread-title.command';
import { MessageDtoMapper } from '../../../../threads/presenters/http/mappers/message.mapper';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text.message-content.entity';
import { PotentialModel } from 'src/domain/models/domain/potential-model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import {
  RunTextInput,
  RunInput,
  RunToolResultInput,
} from 'src/domain/runs/domain/run-input.entity';
import { randomUUID, UUID } from 'crypto';
import { AssistantMessageResponseDto } from '../../../../threads/presenters/http/dto/message-response.dto';

describe('ExecuteRunAndSetTitleUseCase', () => {
  let useCase: ExecuteRunAndSetTitleUseCase;
  let mockExecuteRunUseCase: jest.Mocked<ExecuteRunUseCase>;
  let mockFindThreadUseCase: jest.Mocked<FindThreadUseCase>;
  let mockGenerateAndSetThreadTitleUseCase: jest.Mocked<GenerateAndSetThreadTitleUseCase>;
  let mockMessageDtoMapper: jest.Mocked<MessageDtoMapper>;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockExecuteRunUseCase = {
      execute: jest.fn(),
    } as any;

    mockFindThreadUseCase = {
      execute: jest.fn(),
    } as any;

    mockGenerateAndSetThreadTitleUseCase = {
      execute: jest.fn(),
    } as any;

    mockMessageDtoMapper = {
      toDto: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecuteRunAndSetTitleUseCase,
        {
          provide: ExecuteRunUseCase,
          useValue: mockExecuteRunUseCase,
        },
        {
          provide: FindThreadUseCase,
          useValue: mockFindThreadUseCase,
        },
        {
          provide: GenerateAndSetThreadTitleUseCase,
          useValue: mockGenerateAndSetThreadTitleUseCase,
        },
        {
          provide: MessageDtoMapper,
          useValue: mockMessageDtoMapper,
        },
      ],
    }).compile();

    useCase = module.get<ExecuteRunAndSetTitleUseCase>(
      ExecuteRunAndSetTitleUseCase,
    );

    // Mock logger
    loggerSpy = jest.spyOn(useCase['logger'], 'log').mockImplementation();
    jest.spyOn(useCase['logger'], 'debug').mockImplementation();
    jest.spyOn(useCase['logger'], 'warn').mockImplementation();
    jest.spyOn(useCase['logger'], 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    let command: ExecuteRunAndSetTitleCommand;
    let userId: UUID;
    let threadId: UUID;
    let thread: Thread;
    let model: PotentialModel;

    beforeEach(() => {
      userId = randomUUID();
      threadId = randomUUID();
      model = new PotentialModel({
        name: 'gpt-4',
        provider: ModelProvider.OPENAI,
        displayName: 'GPT-4',
        canStream: true,
        isReasoning: false,
        isArchived: false,
        isProviderDefault: true,
      });
      thread = new Thread({
        id: threadId,
        userId,
        model,
        messages: [],
      });

      command = new ExecuteRunAndSetTitleCommand(
        threadId,
        'gpt-4',
        ModelProvider.OPENAI,
        [],
        new RunTextInput('Hello, how are you?'),
        userId,
      );
    });

    it('should execute run and stream messages for existing thread with messages', async () => {
      // Arrange
      const existingMessage = new UserMessage({
        threadId,
        content: [new TextMessageContent('Previous message')],
      });
      const threadWithMessages = new Thread({
        id: threadId,
        userId,
        model,
        messages: [existingMessage],
      });

      const runMessage = new AssistantMessage({
        threadId,
        content: [new TextMessageContent('Hello! I am doing well.')],
      });

      const messageDto: AssistantMessageResponseDto = {
        id: runMessage.id,
        role: MessageRole.ASSISTANT,
        content: [
          { type: MessageContentType.TEXT, text: 'Hello! I am doing well.' },
        ],
        threadId,
        createdAt: new Date().toISOString(),
      };

      mockFindThreadUseCase.execute.mockResolvedValue(threadWithMessages);
      mockExecuteRunUseCase.execute.mockResolvedValue(
        createAsyncGenerator([runMessage]),
      );
      mockMessageDtoMapper.toDto.mockReturnValue(messageDto);

      // Act
      const results: any[] = [];
      for await (const result of useCase.execute(command)) {
        results.push(result);
      }

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        type: 'message',
        message: messageDto,
        threadId,
        timestamp: expect.any(String),
      });

      expect(mockFindThreadUseCase.execute).toHaveBeenCalledWith(
        new FindThreadQuery(threadId, userId),
      );
      expect(mockExecuteRunUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId,
          modelName: 'gpt-4',
          modelProvider: ModelProvider.OPENAI,
          tools: [],
          input: expect.any(RunTextInput),
          userId,
        }),
      );
      expect(
        mockGenerateAndSetThreadTitleUseCase.execute,
      ).not.toHaveBeenCalled();
    });

    it('should generate title for new thread and stream messages', async () => {
      // Arrange
      const emptyThread = new Thread({
        id: threadId,
        userId,
        model,
        messages: [],
      });

      const runMessage = new AssistantMessage({
        threadId,
        content: [new TextMessageContent('Hello! I am doing well.')],
      });

      const messageDto: AssistantMessageResponseDto = {
        id: runMessage.id,
        role: MessageRole.ASSISTANT,
        content: [
          { type: MessageContentType.TEXT, text: 'Hello! I am doing well.' },
        ],
        threadId,
        createdAt: new Date().toISOString(),
      };

      const generatedTitle = 'Greeting Conversation';

      mockFindThreadUseCase.execute.mockResolvedValue(emptyThread);
      mockExecuteRunUseCase.execute.mockResolvedValue(
        createAsyncGenerator([runMessage]),
      );
      mockMessageDtoMapper.toDto.mockReturnValue(messageDto);
      mockGenerateAndSetThreadTitleUseCase.execute.mockResolvedValue(
        generatedTitle,
      );

      // Act
      const results: any[] = [];
      for await (const result of useCase.execute(command)) {
        results.push(result);
      }

      // Assert
      expect(results).toHaveLength(2);

      // First result should be thread title update
      expect(results[0]).toEqual({
        type: 'thread',
        threadId,
        updateType: 'title_updated',
        title: generatedTitle,
        timestamp: expect.any(String),
      });

      // Second result should be the message
      expect(results[1]).toEqual({
        type: 'message',
        message: messageDto,
        threadId,
        timestamp: expect.any(String),
      });

      expect(mockGenerateAndSetThreadTitleUseCase.execute).toHaveBeenCalledWith(
        new GenerateAndSetThreadTitleCommand(
          emptyThread,
          emptyThread.model,
          'Hello, how are you?',
          userId,
        ),
      );
    });

    it('should handle complex input structure for title generation', async () => {
      // Arrange
      const complexInput = new RunTextInput('What is the weather like today?');

      const commandWithComplexInput = new ExecuteRunAndSetTitleCommand(
        threadId,
        'gpt-4',
        ModelProvider.OPENAI,
        [],
        complexInput,
        userId,
      );

      const emptyThread = new Thread({
        id: threadId,
        userId,
        model,
        messages: [],
      });

      const runMessage = new AssistantMessage({
        threadId,
        content: [new TextMessageContent('The weather is sunny.')],
      });

      const messageDto: AssistantMessageResponseDto = {
        id: runMessage.id,
        role: MessageRole.ASSISTANT,
        content: [
          { type: MessageContentType.TEXT, text: 'The weather is sunny.' },
        ],
        threadId,
        createdAt: new Date().toISOString(),
      };

      mockFindThreadUseCase.execute.mockResolvedValue(emptyThread);
      mockExecuteRunUseCase.execute.mockResolvedValue(
        createAsyncGenerator([runMessage]),
      );
      mockMessageDtoMapper.toDto.mockReturnValue(messageDto);
      mockGenerateAndSetThreadTitleUseCase.execute.mockResolvedValue(
        'Weather Inquiry',
      );

      // Act
      const results: any[] = [];
      for await (const result of useCase.execute(commandWithComplexInput)) {
        results.push(result);
      }

      // Assert
      expect(results).toHaveLength(2);
      expect(mockGenerateAndSetThreadTitleUseCase.execute).toHaveBeenCalledWith(
        new GenerateAndSetThreadTitleCommand(
          emptyThread,
          emptyThread.model,
          'What is the weather like today?',
          userId,
        ),
      );
    });

    it('should continue execution even if thread lookup fails', async () => {
      // Arrange
      const runMessage = new AssistantMessage({
        threadId,
        content: [new TextMessageContent('Hello! I am doing well.')],
      });

      const messageDto: AssistantMessageResponseDto = {
        id: runMessage.id,
        role: MessageRole.ASSISTANT,
        content: [
          { type: MessageContentType.TEXT, text: 'Hello! I am doing well.' },
        ],
        threadId,
        createdAt: new Date().toISOString(),
      };

      mockFindThreadUseCase.execute.mockRejectedValue(
        new Error('Thread not found'),
      );
      mockExecuteRunUseCase.execute.mockResolvedValue(
        createAsyncGenerator([runMessage]),
      );
      mockMessageDtoMapper.toDto.mockReturnValue(messageDto);

      // Act
      const results: any[] = [];
      for await (const result of useCase.execute(command)) {
        results.push(result);
      }

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        type: 'message',
        message: messageDto,
        threadId,
        timestamp: expect.any(String),
      });

      expect(useCase['logger'].warn).toHaveBeenCalledWith(
        'Error in executeRunAndSetTitle',
        {
          threadId,
          error: 'Thread not found',
        },
      );
    });

    it('should not generate title if thread title generation fails but continue execution', async () => {
      // Arrange
      const emptyThread = new Thread({
        id: threadId,
        userId,
        model,
        messages: [],
      });

      const runMessage = new AssistantMessage({
        threadId,
        content: [new TextMessageContent('Hello! I am doing well.')],
      });

      const messageDto: AssistantMessageResponseDto = {
        id: runMessage.id,
        role: MessageRole.ASSISTANT,
        content: [
          { type: MessageContentType.TEXT, text: 'Hello! I am doing well.' },
        ],
        threadId,
        createdAt: new Date().toISOString(),
      };

      mockFindThreadUseCase.execute.mockResolvedValue(emptyThread);
      mockExecuteRunUseCase.execute.mockResolvedValue(
        createAsyncGenerator([runMessage]),
      );
      mockMessageDtoMapper.toDto.mockReturnValue(messageDto);
      mockGenerateAndSetThreadTitleUseCase.execute.mockRejectedValue(
        new Error('Title generation failed'),
      );

      // Act
      const results: any[] = [];
      for await (const result of useCase.execute(command)) {
        results.push(result);
      }

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        type: 'message',
        message: messageDto,
        threadId,
        timestamp: expect.any(String),
      });

      expect(useCase['logger'].warn).toHaveBeenCalledWith(
        'Error in executeRunAndSetTitle',
        {
          threadId,
          error: 'Title generation failed',
        },
      );
    });

    it('should handle execution errors and yield error response', async () => {
      // Arrange
      const executionError = new Error('Execution failed');
      mockFindThreadUseCase.execute.mockResolvedValue(thread);
      mockExecuteRunUseCase.execute.mockRejectedValue(executionError);

      // Act
      const results: any[] = [];
      for await (const result of useCase.execute(command)) {
        results.push(result);
      }

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        type: 'error',
        message: 'Execution failed',
        threadId,
        timestamp: expect.any(String),
        code: 'EXECUTION_ERROR',
        details: {
          error: executionError.toString(),
          stack: executionError.stack,
        },
      });

      expect(useCase['logger'].error).toHaveBeenCalledWith(
        'Error in executeRunAndSetTitle',
        executionError,
      );
    });

    it('should handle multiple messages streaming', async () => {
      // Arrange
      const emptyThread = new Thread({
        id: threadId,
        userId,
        model,
        messages: [],
      });

      const message1 = new AssistantMessage({
        threadId,
        content: [new TextMessageContent('First message')],
      });

      const message2 = new AssistantMessage({
        threadId,
        content: [new TextMessageContent('Second message')],
      });

      const messageDto1: AssistantMessageResponseDto = {
        id: message1.id,
        role: MessageRole.ASSISTANT,
        content: [{ type: MessageContentType.TEXT, text: 'First message' }],
        threadId,
        createdAt: new Date().toISOString(),
      };

      const messageDto2: AssistantMessageResponseDto = {
        id: message2.id,
        role: MessageRole.ASSISTANT,
        content: [{ type: MessageContentType.TEXT, text: 'Second message' }],
        threadId,
        createdAt: new Date().toISOString(),
      };

      mockFindThreadUseCase.execute.mockResolvedValue(emptyThread);
      mockExecuteRunUseCase.execute.mockResolvedValue(
        createAsyncGenerator([message1, message2]),
      );
      mockMessageDtoMapper.toDto
        .mockReturnValueOnce(messageDto1)
        .mockReturnValueOnce(messageDto2);
      mockGenerateAndSetThreadTitleUseCase.execute.mockResolvedValue(
        'Conversation',
      );

      // Act
      const results: any[] = [];
      for await (const result of useCase.execute(command)) {
        results.push(result);
      }

      // Assert
      expect(results).toHaveLength(3);

      // First: title update
      expect(results[0].type).toBe('thread');

      // Then: messages
      expect(results[1]).toEqual({
        type: 'message',
        message: messageDto1,
        threadId,
        timestamp: expect.any(String),
      });

      expect(results[2]).toEqual({
        type: 'message',
        message: messageDto2,
        threadId,
        timestamp: expect.any(String),
      });
    });
  });

  describe('extractUserMessage', () => {
    it('should extract text from RunTextInput', () => {
      // Arrange
      const textInput = new RunTextInput('Hello world');

      // Act
      const result = useCase['extractUserMessage'](textInput);

      // Assert
      expect(result).toBe('Hello world');
    });

    it('should return undefined for RunToolResultInput', () => {
      // Arrange
      const toolResultInput = new RunToolResultInput(
        'tool-id',
        'tool-name',
        'result',
      );

      // Act
      const result = useCase['extractUserMessage'](toolResultInput);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined for base RunInput', () => {
      // Arrange
      const baseInput = new RunInput();

      // Act
      const result = useCase['extractUserMessage'](baseInput);

      // Assert
      expect(result).toBeUndefined();
    });
  });
});

// Helper function to create async generator for testing
async function* createAsyncGenerator<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield item;
  }
}
