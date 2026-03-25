import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AddMessageToThreadUseCase } from './add-message-to-thread.use-case';
import { AddMessageCommand } from './add-message.command';
import { Thread } from '../../../domain/thread.entity';
import { randomUUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ThreadMessageAddedEvent } from '../../events/thread-message-added.event';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';

describe('AddMessageToThreadUseCase', () => {
  let useCase: AddMessageToThreadUseCase;
  let mockContextService: Partial<ContextService>;
  let mockEventEmitter: { emitAsync: jest.Mock };

  beforeAll(async () => {
    mockContextService = {
      get: jest.fn().mockReturnValue(randomUUID()),
    };

    mockEventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddMessageToThreadUseCase,
        { provide: ContextService, useValue: mockContextService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    useCase = module.get<AddMessageToThreadUseCase>(AddMessageToThreadUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (mockContextService.get as jest.Mock).mockReturnValue(randomUUID());
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should add a message to the thread and emit ThreadMessageAddedEvent', () => {
    const thread = new Thread({
      userId: randomUUID(),
      messages: [],
      isAnonymous: false,
    });
    const message = new AssistantMessage({
      threadId: thread.id,
      content: [],
    });
    const command = new AddMessageCommand(thread, message);

    const result = useCase.execute(command);

    expect(result.messages).toContain(message);
    expect(result.messages).toHaveLength(1);
    expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
      ThreadMessageAddedEvent.EVENT_NAME,
      expect.objectContaining({
        threadId: thread.id,
        messageCount: 1,
      }),
    );
  });

  it('should emit correct message count for thread with existing messages', () => {
    const existingMessage = new AssistantMessage({
      threadId: randomUUID(),
      content: [],
    });
    const thread = new Thread({
      userId: randomUUID(),
      messages: [existingMessage],
      isAnonymous: false,
    });
    const newMessage = new AssistantMessage({
      threadId: thread.id,
      content: [],
    });
    const command = new AddMessageCommand(thread, newMessage);

    useCase.execute(command);

    expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
      ThreadMessageAddedEvent.EVENT_NAME,
      expect.objectContaining({
        messageCount: 2,
      }),
    );
  });
});
