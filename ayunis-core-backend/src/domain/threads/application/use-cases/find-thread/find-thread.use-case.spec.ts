import { randomUUID } from 'node:crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { CountMessagesTokensUseCase } from 'src/domain/messages/application/use-cases/count-messages-tokens/count-messages-tokens.use-case';
import type { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { UnexpecteThreadError } from 'src/domain/threads/application/threads.errors';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { FindThreadQuery } from './find-thread.query';
import { FindThreadUseCase } from './find-thread.use-case';

describe('FindThreadUseCase', () => {
  it.each([
    { tokenCount: 50_001, expectedIsLongChat: false },
    { tokenCount: 125_000, expectedIsLongChat: false },
    { tokenCount: 125_001, expectedIsLongChat: true },
  ])(
    'returns isLongChat=$expectedIsLongChat for a $tokenCount-token thread',
    async ({ tokenCount, expectedIsLongChat }) => {
      const userId = randomUUID();
      const thread = new Thread({ userId, messages: [] });
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
