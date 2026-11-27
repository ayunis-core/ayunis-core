import { randomUUID } from 'node:crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { FindAllThreadsQuery } from './find-all-threads.query';
import { FindAllThreadsUseCase } from './find-all-threads.use-case';

describe(FindAllThreadsUseCase.name, () => {
  it.each([{ sessionClient: 'excel' as const }, { sessionClient: undefined }])(
    'derives thread visibility from session client $sessionClient',
    async ({ sessionClient }) => {
      const userId = randomUUID();
      const threadsRepository = {
        findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      } as unknown as jest.Mocked<ThreadsRepository>;
      const contextService = {
        get: jest.fn((key: string) =>
          key === 'client' ? sessionClient : undefined,
        ),
      } as unknown as ContextService;
      const useCase = new FindAllThreadsUseCase(
        threadsRepository,
        contextService,
      );

      await useCase.execute(
        new FindAllThreadsQuery(userId, undefined, {
          search: 'budget',
        }),
      );

      expect(threadsRepository.findAll).toHaveBeenCalledWith(
        userId,
        undefined,
        { search: 'budget', client: sessionClient },
        { limit: 50, offset: 0 },
      );
    },
  );
});
