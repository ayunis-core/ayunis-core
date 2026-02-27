import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AddMessageToThreadUseCase } from './add-message-to-thread.use-case';
import { AddMessageCommand } from './add-message.command';
import { Thread } from '../../../domain/thread.entity';
import { randomUUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getToken } from '@willsoto/nestjs-prometheus';
import { AYUNIS_THREAD_MESSAGE_COUNT } from 'src/metrics/metrics.constants';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';

describe('AddMessageToThreadUseCase', () => {
  let useCase: AddMessageToThreadUseCase;
  let mockContextService: Partial<ContextService>;
  let mockHistogram: { observe: jest.Mock };

  beforeAll(async () => {
    mockContextService = {
      get: jest.fn().mockReturnValue(randomUUID()),
    };

    mockHistogram = { observe: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddMessageToThreadUseCase,
        { provide: ContextService, useValue: mockContextService },
        {
          provide: getToken(AYUNIS_THREAD_MESSAGE_COUNT),
          useValue: mockHistogram,
        },
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

  it('should add a message to the thread and observe the histogram', () => {
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
    expect(mockHistogram.observe).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: expect.any(String) }),
      1,
    );
  });

  it('should observe correct message count for thread with existing messages', () => {
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

    expect(mockHistogram.observe).toHaveBeenCalledWith(expect.any(Object), 2);
  });
});
