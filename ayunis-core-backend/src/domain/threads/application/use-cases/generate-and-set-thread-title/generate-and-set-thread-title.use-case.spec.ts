import { Test, TestingModule } from '@nestjs/testing';
import { GenerateAndSetThreadTitleUseCase } from './generate-and-set-thread-title.use-case';
import { GenerateAndSetThreadTitleCommand } from './generate-and-set-thread-title.command';
import { UpdateThreadTitleUseCase } from '../update-thread-title/update-thread-title.use-case';
import { UpdateThreadTitleCommand } from '../update-thread-title/update-thread-title.command';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { GetInferenceCommand } from 'src/domain/models/application/use-cases/get-inference/get-inference.command';
import { InferenceResponse } from 'src/domain/models/application/ports/inference.handler';
import { Thread } from '../../../domain/thread.entity';
import { PotentialModel } from 'src/domain/models/domain/potential-model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.object';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { randomUUID, UUID } from 'crypto';

describe('GenerateAndSetThreadTitleUseCase', () => {
  let useCase: GenerateAndSetThreadTitleUseCase;
  let mockUpdateThreadTitleUseCase: jest.Mocked<UpdateThreadTitleUseCase>;
  let mockTriggerInferenceUseCase: jest.Mocked<GetInferenceUseCase>;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockUpdateThreadTitleUseCase = {
      execute: jest.fn(),
    } as any;

    mockTriggerInferenceUseCase = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateAndSetThreadTitleUseCase,
        {
          provide: UpdateThreadTitleUseCase,
          useValue: mockUpdateThreadTitleUseCase,
        },
        {
          provide: GetInferenceUseCase,
          useValue: mockTriggerInferenceUseCase,
        },
      ],
    }).compile();

    useCase = module.get<GenerateAndSetThreadTitleUseCase>(
      GenerateAndSetThreadTitleUseCase,
    );

    // Mock logger
    loggerSpy = jest.spyOn(useCase['logger'], 'log').mockImplementation();
    jest.spyOn(useCase['logger'], 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    let thread: Thread;
    let model: PotentialModel;
    let userId: UUID;
    let command: GenerateAndSetThreadTitleCommand;

    beforeEach(() => {
      userId = randomUUID();
      thread = new Thread({
        userId,
        model: new PotentialModel({
          name: 'gpt-4',
          provider: ModelProvider.OPENAI,
          displayName: 'GPT-4',
          canStream: true,
          isReasoning: false,
          isArchived: false,
          isProviderDefault: true,
        }),
        messages: [],
      });
      model = new PotentialModel({
        name: 'gpt-4',
        provider: ModelProvider.OPENAI,
        displayName: 'GPT-4',
        canStream: true,
        isReasoning: false,
        isArchived: false,
        isProviderDefault: true,
      });
      command = new GenerateAndSetThreadTitleCommand(
        thread,
        model,
        'How do I create a React component?',
        userId,
      );
    });

    it('should generate and set title successfully and return the title', async () => {
      // Arrange
      const generatedTitle = 'Creating React Components';
      const mockResponse = new InferenceResponse(
        [new TextMessageContent(generatedTitle)],
        {},
      );

      mockTriggerInferenceUseCase.execute.mockResolvedValue(mockResponse);
      mockUpdateThreadTitleUseCase.execute.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toBe(generatedTitle);
      expect(mockTriggerInferenceUseCase.execute).toHaveBeenCalledWith(
        expect.any(GetInferenceCommand),
      );
      expect(mockUpdateThreadTitleUseCase.execute).toHaveBeenCalledWith(
        new UpdateThreadTitleCommand(thread.id, userId, generatedTitle),
      );
    });

    it('should create proper prompt for title generation', async () => {
      // Arrange
      const mockResponse = new InferenceResponse(
        [new TextMessageContent('Test Title')],
        {},
      );

      mockTriggerInferenceUseCase.execute.mockResolvedValue(mockResponse);
      mockUpdateThreadTitleUseCase.execute.mockResolvedValue(undefined);

      // Act
      await useCase.execute(command);

      // Assert
      const triggerInferenceCall =
        mockTriggerInferenceUseCase.execute.mock.calls[0][0];
      expect(triggerInferenceCall.modelName).toBe(model.name);
      expect(triggerInferenceCall.modelProvider).toBe(model.provider);

      const userMessage = triggerInferenceCall.messages[0];
      expect(userMessage).toBeInstanceOf(UserMessage);
      expect(userMessage.content).toHaveLength(1);
      expect(userMessage.content[0]).toBeInstanceOf(TextMessageContent);

      const promptContent = (userMessage.content[0] as TextMessageContent).text;
      expect(promptContent).toContain('How do I create a React component?');
      expect(promptContent).toContain('maximum 50 characters');
    });

    it('should trim generated title before setting', async () => {
      // Arrange
      const generatedTitle = '  Creating React Components  ';
      const expectedTrimmedTitle = 'Creating React Components';
      const mockResponse = new InferenceResponse(
        [new TextMessageContent(generatedTitle)],
        {},
      );

      mockTriggerInferenceUseCase.execute.mockResolvedValue(mockResponse);
      mockUpdateThreadTitleUseCase.execute.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toBe(expectedTrimmedTitle);
      expect(mockUpdateThreadTitleUseCase.execute).toHaveBeenCalledWith(
        new UpdateThreadTitleCommand(thread.id, userId, expectedTrimmedTitle),
      );
    });

    it('should return null when response is empty and log error', async () => {
      // Arrange
      const mockResponse = new InferenceResponse([], {});

      mockTriggerInferenceUseCase.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toBeNull();
      expect(mockUpdateThreadTitleUseCase.execute).not.toHaveBeenCalled();
      expect(useCase['logger'].error).toHaveBeenCalledWith(
        'Failed to generate title',
        expect.objectContaining({
          threadId: thread.id,
          error: expect.any(Object),
        }),
      );
    });

    it('should return null when response is not text content and log error', async () => {
      // Arrange
      const mockResponse = new InferenceResponse(
        [new ToolUseMessageContent('test-id', 'test-tool', {})],
        {},
      );

      mockTriggerInferenceUseCase.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toBeNull();
      expect(mockUpdateThreadTitleUseCase.execute).not.toHaveBeenCalled();
      expect(useCase['logger'].error).toHaveBeenCalledWith(
        'Failed to generate title',
        expect.objectContaining({
          threadId: thread.id,
          error: expect.any(Object),
        }),
      );
    });

    it('should return null when title is empty after trimming and log error', async () => {
      // Arrange
      const mockResponse = new InferenceResponse(
        [new TextMessageContent('   ')],
        {},
      );

      mockTriggerInferenceUseCase.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toBeNull();
      expect(mockUpdateThreadTitleUseCase.execute).not.toHaveBeenCalled();
      expect(useCase['logger'].error).toHaveBeenCalledWith(
        'Failed to generate title',
        expect.objectContaining({
          threadId: thread.id,
          error: expect.any(Object),
        }),
      );
    });

    it('should return null when inference fails and log error', async () => {
      // Arrange
      const inferenceError = new Error('Inference service unavailable');
      mockTriggerInferenceUseCase.execute.mockRejectedValue(inferenceError);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toBeNull();
      expect(mockUpdateThreadTitleUseCase.execute).not.toHaveBeenCalled();
      expect(useCase['logger'].error).toHaveBeenCalledWith(
        'Failed to generate title',
        expect.objectContaining({
          threadId: thread.id,
          error: expect.any(Object),
        }),
      );
    });

    it('should return null when update title fails and log error', async () => {
      // Arrange
      const mockResponse = new InferenceResponse(
        [new TextMessageContent('Test Title')],
        {},
      );
      const updateError = new Error('Database connection failed');

      mockTriggerInferenceUseCase.execute.mockResolvedValue(mockResponse);
      mockUpdateThreadTitleUseCase.execute.mockRejectedValue(updateError);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toBeNull();
      expect(mockUpdateThreadTitleUseCase.execute).toHaveBeenCalled();
      expect(useCase['logger'].error).toHaveBeenCalledWith(
        'Failed to generate title',
        expect.objectContaining({
          threadId: thread.id,
          error: expect.any(Object),
        }),
      );
    });

    it('should handle different model providers', async () => {
      // Arrange
      const anthropicModel = new PotentialModel({
        name: 'claude-3',
        provider: ModelProvider.ANTHROPIC,
        displayName: 'Claude 3',
        canStream: true,
        isReasoning: false,
        isArchived: false,
        isProviderDefault: true,
      });
      const anthropicCommand = new GenerateAndSetThreadTitleCommand(
        thread,
        anthropicModel,
        'Test message',
        userId,
      );

      const mockResponse = new InferenceResponse(
        [new TextMessageContent('Test Title')],
        {},
      );

      mockTriggerInferenceUseCase.execute.mockResolvedValue(mockResponse);
      mockUpdateThreadTitleUseCase.execute.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(anthropicCommand);

      // Assert
      expect(result).toBe('Test Title');
      const triggerInferenceCall =
        mockTriggerInferenceUseCase.execute.mock.calls[0][0];
      expect(triggerInferenceCall.modelName).toBe(anthropicModel.name);
      expect(triggerInferenceCall.modelProvider).toBe(anthropicModel.provider);
    });

    it('should handle long messages in prompt', async () => {
      // Arrange
      const longMessage = 'A'.repeat(1000);
      const longMessageCommand = new GenerateAndSetThreadTitleCommand(
        thread,
        model,
        longMessage,
        userId,
      );

      const mockResponse = new InferenceResponse(
        [new TextMessageContent('Long Message Title')],
        {},
      );

      mockTriggerInferenceUseCase.execute.mockResolvedValue(mockResponse);
      mockUpdateThreadTitleUseCase.execute.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(longMessageCommand);

      // Assert
      expect(result).toBe('Long Message Title');
      const triggerInferenceCall =
        mockTriggerInferenceUseCase.execute.mock.calls[0][0];
      const promptContent = (
        triggerInferenceCall.messages[0].content[0] as TextMessageContent
      ).text;
      expect(promptContent).toContain(longMessage);
    });

    it('should log the start of title generation', async () => {
      // Arrange
      const mockResponse = new InferenceResponse(
        [new TextMessageContent('Test Title')],
        {},
      );

      mockTriggerInferenceUseCase.execute.mockResolvedValue(mockResponse);
      mockUpdateThreadTitleUseCase.execute.mockResolvedValue(undefined);

      // Act
      await useCase.execute(command);

      // Assert
      expect(useCase['logger'].log).toHaveBeenCalledWith(
        'generateAndSetTitle',
        { threadId: thread.id },
      );
    });

    it('should use thread id for user message creation', async () => {
      // Arrange
      const mockResponse = new InferenceResponse(
        [new TextMessageContent('Test Title')],
        {},
      );

      mockTriggerInferenceUseCase.execute.mockResolvedValue(mockResponse);
      mockUpdateThreadTitleUseCase.execute.mockResolvedValue(undefined);

      // Act
      await useCase.execute(command);

      // Assert
      const triggerInferenceCall =
        mockTriggerInferenceUseCase.execute.mock.calls[0][0];
      const userMessage = triggerInferenceCall.messages[0] as UserMessage;
      expect(userMessage.threadId).toBe(thread.id);
    });
  });
});
