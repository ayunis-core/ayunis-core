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
import { getToken } from '@willsoto/nestjs-prometheus';
import { AYUNIS_MESSAGES_TOTAL } from 'src/metrics/metrics.constants';

describe('SaveAssistantMessageUseCase', () => {
  let useCase: SaveAssistantMessageUseCase;
  let mockMessagesRepository: Partial<MessagesRepository>;
  let mockContextService: Partial<ContextService>;
  let mockMessagesCounter: { inc: jest.Mock };

  beforeAll(async () => {
    mockMessagesRepository = {
      create: jest.fn(),
    };

    mockContextService = {
      get: jest.fn().mockReturnValue(randomUUID()),
    };

    mockMessagesCounter = { inc: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaveAssistantMessageUseCase,
        { provide: MESSAGES_REPOSITORY, useValue: mockMessagesRepository },
        { provide: ContextService, useValue: mockContextService },
        {
          provide: getToken(AYUNIS_MESSAGES_TOTAL),
          useValue: mockMessagesCounter,
        },
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

  it('should save an assistant message and increment the metric', async () => {
    const threadId = randomUUID();
    const message = new AssistantMessage({ threadId, content: [] });
    const command = new SaveAssistantMessageCommand(message);

    jest.spyOn(mockMessagesRepository, 'create').mockResolvedValue(message);

    const result = await useCase.execute(command);

    expect(result).toBe(message);
    expect(mockMessagesRepository.create).toHaveBeenCalledWith(message);
    expect(mockMessagesCounter.inc).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'assistant' }),
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

  it('should not propagate metric errors', async () => {
    const threadId = randomUUID();
    const message = new AssistantMessage({ threadId, content: [] });
    const command = new SaveAssistantMessageCommand(message);

    jest.spyOn(mockMessagesRepository, 'create').mockResolvedValue(message);
    mockMessagesCounter.inc.mockImplementation(() => {
      throw new Error('Metric registration error');
    });

    const result = await useCase.execute(command);

    expect(result).toBe(message);
  });
});
