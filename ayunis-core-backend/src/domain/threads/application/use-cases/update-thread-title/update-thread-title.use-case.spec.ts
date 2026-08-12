import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { ThreadsRepository } from '../../ports/threads.repository';
import { ThreadErrorCode, ThreadNotFoundError } from '../../threads.errors';
import { UpdateThreadTitleCommand } from './update-thread-title.command';
import { UpdateThreadTitleUseCase } from './update-thread-title.use-case';

describe('UpdateThreadTitleUseCase', () => {
  it('returns the non-leaking not-found response when the scoped update misses', async () => {
    const threadId = randomUUID();
    const userId = randomUUID();
    const notFoundError = new ThreadNotFoundError(threadId, userId);
    const threadsRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      updateTitle: jest.fn().mockRejectedValue(notFoundError),
    } as unknown as jest.Mocked<ThreadsRepository>;
    const contextService = {
      get: jest.fn().mockReturnValue(userId),
    } as unknown as ContextService;
    const useCase = new UpdateThreadTitleUseCase(
      threadsRepository,
      contextService,
    );

    const result = useCase.execute(
      new UpdateThreadTitleCommand({
        threadId,
        title: 'Updated conversation title',
      }),
    );

    await expect(result).rejects.toMatchObject({
      code: ThreadErrorCode.THREAD_NOT_FOUND,
      statusCode: 404,
    });
  });
});
