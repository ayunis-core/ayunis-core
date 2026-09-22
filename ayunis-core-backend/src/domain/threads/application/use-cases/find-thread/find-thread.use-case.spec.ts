import { randomUUID } from 'node:crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { CountMessagesTokensUseCase } from 'src/domain/messages/application/use-cases/count-messages-tokens/count-messages-tokens.use-case';
import type { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { UnexpecteThreadError } from 'src/domain/threads/application/threads.errors';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { FindThreadQuery } from './find-thread.query';
import { FindThreadUseCase } from './find-thread.use-case';

describe('FindThreadUseCase', () => {
  it.each([
    { tokenCount: 625_000, expectedIsLongChat: false },
    { tokenCount: 625_001, expectedIsLongChat: true },
  ])(
    'returns isLongChat=$expectedIsLongChat for a $tokenCount-token Claude Opus thread',
    async ({ tokenCount, expectedIsLongChat }) => {
      const userId = randomUUID();
      const thread = new Thread({
        userId,
        messages: [],
        model: {
          model: { name: 'claude-opus-4-7' },
        } as PermittedLanguageModel,
      });
      const threadsRepository = {
        findOne: jest.fn().mockResolvedValue(thread),
      } as unknown as jest.Mocked<ThreadsRepository>;
      const contextService = {
        get: jest.fn().mockReturnValue(userId),
      } as unknown as jest.Mocked<ContextService>;
      const countMessagesTokensUseCase = {
        execute: jest.fn().mockReturnValue(tokenCount),
      } as unknown as jest.Mocked<CountMessagesTokensUseCase>;
      const useCase = new FindThreadUseCase(
        threadsRepository,
        contextService,
        countMessagesTokensUseCase,
      );

      const result = await useCase.execute(new FindThreadQuery(thread.id));

      expect(result.isLongChat).toBe(expectedIsLongChat);
    },
  );

  it('uses the fallback budget when the thread has no model', async () => {
    const userId = randomUUID();
    const thread = new Thread({ userId, messages: [] });
    const threadsRepository = {
      findOne: jest.fn().mockResolvedValue(thread),
    } as unknown as jest.Mocked<ThreadsRepository>;
    const contextService = {
      get: jest.fn().mockReturnValue(userId),
    } as unknown as jest.Mocked<ContextService>;
    const countMessagesTokensUseCase = {
      execute: jest.fn().mockReturnValue(125_001),
    } as unknown as jest.Mocked<CountMessagesTokensUseCase>;
    const useCase = new FindThreadUseCase(
      threadsRepository,
      contextService,
      countMessagesTokensUseCase,
    );

    const result = await useCase.execute(new FindThreadQuery(thread.id));

    expect(result.isLongChat).toBe(true);
  });

  it('rejects requests without a user context', async () => {
    const threadsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<ThreadsRepository>;
    const contextService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as jest.Mocked<ContextService>;
    const countMessagesTokensUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CountMessagesTokensUseCase>;
    const useCase = new FindThreadUseCase(
      threadsRepository,
      contextService,
      countMessagesTokensUseCase,
    );

    await expect(
      useCase.execute(new FindThreadQuery(randomUUID())),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(threadsRepository.findOne).not.toHaveBeenCalled();
  });

  it('wraps unexpected repository failures', async () => {
    const userId = randomUUID();
    const threadsRepository = {
      findOne: jest.fn().mockRejectedValue(new Error('database unavailable')),
    } as unknown as jest.Mocked<ThreadsRepository>;
    const contextService = {
      get: jest.fn().mockReturnValue(userId),
    } as unknown as jest.Mocked<ContextService>;
    const countMessagesTokensUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CountMessagesTokensUseCase>;
    const useCase = new FindThreadUseCase(
      threadsRepository,
      contextService,
      countMessagesTokensUseCase,
    );

    await expect(
      useCase.execute(new FindThreadQuery(randomUUID())),
    ).rejects.toThrow(UnexpecteThreadError);
  });
});
