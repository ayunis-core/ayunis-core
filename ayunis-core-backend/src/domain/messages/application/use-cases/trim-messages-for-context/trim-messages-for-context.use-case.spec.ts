import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { TrimMessagesForContextUseCase } from './trim-messages-for-context.use-case';
import { TrimMessagesForContextCommand } from './trim-messages-for-context.command';
import { CountTokensUseCase } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.use-case';
import { UserMessage } from '../../../domain/messages/user-message.entity';
import { AssistantMessage } from '../../../domain/messages/assistant-message.entity';
import { TextMessageContent } from '../../../domain/message-contents/text-message-content.entity';
import type { Message } from '../../../domain/message.entity';

describe('TrimMessagesForContextUseCase', () => {
  let useCase: TrimMessagesForContextUseCase;
  let mockCountTokensUseCase: jest.Mocked<CountTokensUseCase>;

  const threadId = randomUUID();

  const createUserMessage = (
    text: string,
    createdAt: Date,
    id?: UUID,
  ): UserMessage => {
    return new UserMessage({
      id,
      threadId,
      createdAt,
      content: [new TextMessageContent(text)],
    });
  };

  const createAssistantMessage = (
    text: string,
    createdAt: Date,
    id?: UUID,
  ): AssistantMessage => {
    return new AssistantMessage({
      id,
      threadId,
      createdAt,
      content: [new TextMessageContent(text)],
    });
  };

  beforeAll(async () => {
    mockCountTokensUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CountTokensUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrimMessagesForContextUseCase,
        { provide: CountTokensUseCase, useValue: mockCountTokensUseCase },
      ],
    }).compile();

    useCase = module.get<TrimMessagesForContextUseCase>(
      TrimMessagesForContextUseCase,
    );
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should return empty array for empty messages', () => {
      const command = new TrimMessagesForContextCommand([], 1000);

      const result = useCase.execute(command);

      expect(result).toEqual([]);
      expect(mockCountTokensUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return all messages when total tokens fit within limit', () => {
      const messages: Message[] = [
        createUserMessage('Hello', new Date('2024-01-01T10:00:00Z')),
        createAssistantMessage('Hi there', new Date('2024-01-01T10:01:00Z')),
        createUserMessage('How are you?', new Date('2024-01-01T10:02:00Z')),
      ];

      // Each message counts as 10 tokens
      mockCountTokensUseCase.execute.mockReturnValue(10);

      const command = new TrimMessagesForContextCommand(messages, 100);
      const result = useCase.execute(command);

      expect(result).toHaveLength(3);
      expect(result[0].role).toBe('user');
    });

    it('should trim messages from the beginning when exceeding token limit', () => {
      const messages: Message[] = [
        createUserMessage('First user', new Date('2024-01-01T10:00:00Z')),
        createAssistantMessage('First reply', new Date('2024-01-01T10:01:00Z')),
        createUserMessage('Second user', new Date('2024-01-01T10:02:00Z')),
        createAssistantMessage(
          'Second reply',
          new Date('2024-01-01T10:03:00Z'),
        ),
      ];

      // Each message counts as 30 tokens, limit is 100
      // Can fit 3 messages (90 tokens), but need to ensure first is user
      mockCountTokensUseCase.execute.mockReturnValue(30);

      const command = new TrimMessagesForContextCommand(messages, 100);
      const result = useCase.execute(command);

      // Should keep last 3 messages: assistant, user, assistant
      // But first must be user, so should skip assistant and keep: user, assistant
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
    });

    it('should ensure first message is a user message by skipping non-user messages', () => {
      const messages: Message[] = [
        createAssistantMessage(
          'Orphan assistant',
          new Date('2024-01-01T10:00:00Z'),
        ),
        createUserMessage('User message', new Date('2024-01-01T10:01:00Z')),
        createAssistantMessage('Reply', new Date('2024-01-01T10:02:00Z')),
      ];

      mockCountTokensUseCase.execute.mockReturnValue(10);

      const command = new TrimMessagesForContextCommand(messages, 100);
      const result = useCase.execute(command);

      // All fit, but first is assistant, should skip to first user
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
    });

    it('should return empty array when no user messages exist in selection', () => {
      const messages: Message[] = [
        createAssistantMessage('First', new Date('2024-01-01T10:00:00Z')),
        createAssistantMessage('Second', new Date('2024-01-01T10:01:00Z')),
      ];

      mockCountTokensUseCase.execute.mockReturnValue(10);

      const command = new TrimMessagesForContextCommand(messages, 100);
      const result = useCase.execute(command);

      expect(result).toEqual([]);
    });

    it('should sort messages by creation date before processing', () => {
      // Messages provided out of order
      const messages: Message[] = [
        createUserMessage('Third', new Date('2024-01-01T10:02:00Z')),
        createUserMessage('First', new Date('2024-01-01T10:00:00Z')),
        createAssistantMessage('Second', new Date('2024-01-01T10:01:00Z')),
      ];

      mockCountTokensUseCase.execute.mockReturnValue(10);

      const command = new TrimMessagesForContextCommand(messages, 100);
      const result = useCase.execute(command);

      expect(result).toHaveLength(3);
      // Should be sorted: First (user), Second (assistant), Third (user)
      expect(result[0].createdAt).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(result[1].createdAt).toEqual(new Date('2024-01-01T10:01:00Z'));
      expect(result[2].createdAt).toEqual(new Date('2024-01-01T10:02:00Z'));
    });

    it('should handle single user message', () => {
      const messages: Message[] = [
        createUserMessage('Only message', new Date('2024-01-01T10:00:00Z')),
      ];

      mockCountTokensUseCase.execute.mockReturnValue(10);

      const command = new TrimMessagesForContextCommand(messages, 100);
      const result = useCase.execute(command);

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
    });

    it('should return empty when single user message exceeds limit', () => {
      const messages: Message[] = [
        createUserMessage('Large message', new Date('2024-01-01T10:00:00Z')),
      ];

      mockCountTokensUseCase.execute.mockReturnValue(200);

      const command = new TrimMessagesForContextCommand(messages, 100);
      const result = useCase.execute(command);

      // Cannot fit any messages
      expect(result).toEqual([]);
    });

    it('should keep most recent messages when trimming', () => {
      const oldUserMsg = createUserMessage(
        'Old user',
        new Date('2024-01-01T10:00:00Z'),
      );
      const oldAssistantMsg = createAssistantMessage(
        'Old assistant',
        new Date('2024-01-01T10:01:00Z'),
      );
      const newUserMsg = createUserMessage(
        'New user',
        new Date('2024-01-01T10:02:00Z'),
      );
      const newAssistantMsg = createAssistantMessage(
        'New assistant',
        new Date('2024-01-01T10:03:00Z'),
      );

      const messages: Message[] = [
        oldUserMsg,
        oldAssistantMsg,
        newUserMsg,
        newAssistantMsg,
      ];

      // Each message is 40 tokens, limit is 100 (can fit 2)
      mockCountTokensUseCase.execute.mockReturnValue(40);

      const command = new TrimMessagesForContextCommand(messages, 100);
      const result = useCase.execute(command);

      // Should keep the 2 most recent: newUserMsg, newAssistantMsg
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(newUserMsg.id);
      expect(result[1].id).toBe(newAssistantMsg.id);
    });

    it('should handle messages with empty content (0 tokens)', () => {
      const emptyUserMsg = new UserMessage({
        threadId,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        content: [],
      });
      const normalUserMsg = createUserMessage(
        'Normal',
        new Date('2024-01-01T10:01:00Z'),
      );

      const messages: Message[] = [emptyUserMsg, normalUserMsg];

      mockCountTokensUseCase.execute.mockReturnValue(10);

      const command = new TrimMessagesForContextCommand(messages, 100);
      const result = useCase.execute(command);

      expect(result).toHaveLength(2);
    });

    it('should not mutate the original messages array', () => {
      const messages: Message[] = [
        createUserMessage('Third', new Date('2024-01-01T10:02:00Z')),
        createUserMessage('First', new Date('2024-01-01T10:00:00Z')),
      ];

      const originalOrder = [...messages];
      mockCountTokensUseCase.execute.mockReturnValue(10);

      const command = new TrimMessagesForContextCommand(messages, 100);
      useCase.execute(command);

      // Original array should not be modified
      expect(messages[0].createdAt).toEqual(originalOrder[0].createdAt);
      expect(messages[1].createdAt).toEqual(originalOrder[1].createdAt);
    });

    it('should pass counterType to token counting', () => {
      const messages: Message[] = [
        createUserMessage('Test', new Date('2024-01-01T10:00:00Z')),
      ];

      mockCountTokensUseCase.execute.mockReturnValue(10);

      const command = new TrimMessagesForContextCommand(
        messages,
        100,
        'tiktoken' as any,
      );
      useCase.execute(command);

      expect(mockCountTokensUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          counterType: 'tiktoken',
        }),
      );
    });
  });
});
