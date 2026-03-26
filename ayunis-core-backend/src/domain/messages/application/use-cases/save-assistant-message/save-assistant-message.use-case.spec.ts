import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SaveAssistantMessageUseCase } from './save-assistant-message.use-case';
import type { MessagesRepository } from '../../ports/messages.repository';
import { MESSAGES_REPOSITORY } from '../../ports/messages.repository';
import { SaveAssistantMessageCommand } from './save-assistant-message.command';
import { AssistantMessage } from '../../../domain/messages/assistant-message.entity';
import { MessageCreationError } from '../../messages.errors';
import { randomUUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssistantMessageCreatedEvent } from '../../events/assistant-message-created.event';

describe('SaveAssistantMessageUseCase', () => {
  let useCase: SaveAssistantMessageUseCase;
  let mockMessagesRepository: Partial<MessagesRepository>;
  let mockContextService: Partial<ContextService>;
  let mockEventEmitter: { emitAsync: jest.Mock };

  beforeAll(async () => {
    mockMessagesRepository = {
      create: jest.fn(),
    };

    mockContextService = {
      get: jest.fn().mockReturnValue(randomUUID()),
    };

    mockEventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaveAssistantMessageUseCase,
        { provide: MESSAGES_REPOSITORY, useValue: mockMessagesRepository },
        { provide: ContextService, useValue: mockContextService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    useCase = module.get<SaveAssistantMessageUseCase>(
      SaveAssistantMessageUseCase,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (mockContextService.get as jest.Mock).mockReturnValue(randomUUID());
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should save an assistant message and emit event', async () => {
    const threadId = randomUUID();
    const message = new AssistantMessage({ threadId, content: [] });
    const command = new SaveAssistantMessageCommand(message);

    jest.spyOn(mockMessagesRepository, 'create').mockResolvedValue(message);

    const result = await useCase.execute(command);

    expect(result).toBe(message);
    expect(mockMessagesRepository.create).toHaveBeenCalledWith(message);
    expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
      AssistantMessageCreatedEvent.EVENT_NAME,
      expect.objectContaining({
        threadId: message.threadId,
        messageId: message.id,
      }),
    );
  });

  it('should throw MessageCreationError when repository fails', async () => {
    const threadId = randomUUID();
    const message = new AssistantMessage({ threadId, content: [] });
    const command = new SaveAssistantMessageCommand(message);

    jest
      .spyOn(mockMessagesRepository, 'create')
      .mockRejectedValue(new Error('Database error'));

    await expect(useCase.execute(command)).rejects.toThrow(
      MessageCreationError,
    );
  });

  it('should not propagate event emission errors', async () => {
    const threadId = randomUUID();
    const message = new AssistantMessage({ threadId, content: [] });
    const command = new SaveAssistantMessageCommand(message);

    jest.spyOn(mockMessagesRepository, 'create').mockResolvedValue(message);
    mockEventEmitter.emitAsync.mockRejectedValue(
      new Error('Event emission error'),
    );

    const result = await useCase.execute(command);

    expect(result).toBe(message);
  });
});
