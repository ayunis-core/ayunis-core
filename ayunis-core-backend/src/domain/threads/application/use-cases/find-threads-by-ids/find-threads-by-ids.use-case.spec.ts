import { FindThreadsByIdsUseCase } from './find-threads-by-ids.use-case';
import { FindThreadsByIdsQuery } from './find-threads-by-ids.query';
import type { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';

describe('FindThreadsByIdsUseCase', () => {
  it('delegates the user-scoped batch lookup to the repository', async () => {
    const repository = {
      findAllByIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ThreadsRepository>;
    const context = {
      get: jest.fn((key: string) => (key === 'client' ? 'excel' : undefined)),
    } as unknown as ContextService;
    const useCase = new FindThreadsByIdsUseCase(repository, context);
    const userId = '11111111-1111-4111-8111-111111111111' as UUID;
    const ids = ['22222222-2222-4222-8222-222222222222'] as UUID[];

    await useCase.execute(new FindThreadsByIdsQuery(userId, ids));

    expect(repository.findAllByIds).toHaveBeenCalledWith(userId, ids, 'excel');
  });
});
