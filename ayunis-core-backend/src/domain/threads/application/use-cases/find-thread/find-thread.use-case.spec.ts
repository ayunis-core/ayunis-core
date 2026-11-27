import { randomUUID } from 'node:crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import {
  aUserContext,
  getFromStore,
} from 'src/common/context/testing/context.fixtures';
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
    { tokenCount: 560_000, expectedIsLongChat: false },
    { tokenCount: 560_001, expectedIsLongChat: true },
  ])(
    'returns isLongChat=$expectedIsLongChat for a $tokenCount-token thread with a configured context window',
    async ({ tokenCount, expectedIsLongChat }) => {
      const userId = randomUUID();
      const thread = new Thread({
        userId,
        messages: [],
        model: {
          model: { contextWindowSize: 700_000 },
        } as PermittedLanguageModel,
      });
      const threadsRepository = {
        findOneForSurface: jest.fn().mockResolvedValue(thread),
      } as unknown as jest.Mocked<ThreadsRepository>;
      const contextService = {
        get: jest.fn(
          getFromStore({ ...aUserContext({ userId }), client: 'excel' }),
        ),
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
      expect(threadsRepository.findOneForSurface).toHaveBeenCalledWith(
        thread.id,
        userId,
        'excel',
      );
    },
  );

  it.each([
    { tokenCount: 160_000, expectedIsLongChat: false },
    { tokenCount: 160_001, expectedIsLongChat: true },
  ])(
    'returns isLongChat=$expectedIsLongChat for a $tokenCount-token thread using the fallback budget',
    async ({ tokenCount, expectedIsLongChat }) => {
      const userId = randomUUID();
      const thread = new Thread({ userId, messages: [] });
      const threadsRepository = {
        findOneForSurface: jest.fn().mockResolvedValue(thread),
      } as unknown as jest.Mocked<ThreadsRepository>;
      const contextService = {
        get: jest.fn(getFromStore(aUserContext({ userId }))),
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
      expect(threadsRepository.findOneForSurface).toHaveBeenCalledWith(
        thread.id,
        userId,
        null,
      );
    },
  );

  it('rejects requests without a user context', async () => {
    const threadsRepository = {
      findOneForSurface: jest.fn(),
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
    expect(threadsRepository.findOneForSurface).not.toHaveBeenCalled();
  });

  it('wraps unexpected repository failures', async () => {
    const userId = randomUUID();
    const threadsRepository = {
      findOneForSurface: jest
        .fn()
        .mockRejectedValue(new Error('database unavailable')),
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
