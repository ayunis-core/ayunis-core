import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { CleanupStaleThreadSourcesUseCase } from './cleanup-stale-thread-sources.use-case';
import type { ThreadsRepository } from '../../ports/threads.repository';
import type { FindUnreferencedSourceIdsUseCase } from 'src/domain/sources/application/use-cases/find-unreferenced-source-ids/find-unreferenced-source-ids.use-case';
import type { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { FindUnreferencedSourceIdsQuery } from 'src/domain/sources/application/use-cases/find-unreferenced-source-ids/find-unreferenced-source-ids.query';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';

describe('CleanupStaleThreadSourcesUseCase', () => {
  let useCase: CleanupStaleThreadSourcesUseCase;
  let threadsRepository: jest.Mocked<
    Pick<ThreadsRepository, 'findSourceIdsWithOnlyStaleDirectAssignments'>
  >;
  let findUnreferencedSourceIdsUseCase: jest.Mocked<
    Pick<FindUnreferencedSourceIdsUseCase, 'execute'>
  >;
  let deleteSourcesUseCase: jest.Mocked<Pick<DeleteSourcesUseCase, 'execute'>>;

  beforeEach(() => {
    threadsRepository = {
      findSourceIdsWithOnlyStaleDirectAssignments: jest.fn(),
    };
    findUnreferencedSourceIdsUseCase = { execute: jest.fn() };
    deleteSourcesUseCase = { execute: jest.fn() };

    useCase = new CleanupStaleThreadSourcesUseCase(
      threadsRepository as unknown as ThreadsRepository,
      findUnreferencedSourceIdsUseCase as unknown as FindUnreferencedSourceIdsUseCase,
      deleteSourcesUseCase as unknown as DeleteSourcesUseCase,
    );
  });

  it('returns zero counts and skips downstream calls when no stale candidates', async () => {
    threadsRepository.findSourceIdsWithOnlyStaleDirectAssignments.mockResolvedValue(
      [],
    );

    const result = await useCase.execute();

    expect(result).toEqual({
      scannedCount: 0,
      unreferencedCount: 0,
      deletedCount: 0,
      failedCount: 0,
      errors: [],
    });
    expect(findUnreferencedSourceIdsUseCase.execute).not.toHaveBeenCalled();
    expect(deleteSourcesUseCase.execute).not.toHaveBeenCalled();
  });

  it('reports scannedCount but skips delete when no candidate passes the unreferenced filter', async () => {
    const kept = randomUUID();
    threadsRepository.findSourceIdsWithOnlyStaleDirectAssignments.mockResolvedValue(
      [kept],
    );
    findUnreferencedSourceIdsUseCase.execute.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual({
      scannedCount: 1,
      unreferencedCount: 0,
      deletedCount: 0,
      failedCount: 0,
      errors: [],
    });
    expect(deleteSourcesUseCase.execute).not.toHaveBeenCalled();
  });

  it('deletes the unreferenced subset and records deletedCount', async () => {
    const keep = randomUUID();
    const drop1 = randomUUID();
    const drop2 = randomUUID();
    threadsRepository.findSourceIdsWithOnlyStaleDirectAssignments.mockResolvedValue(
      [keep, drop1, drop2],
    );
    findUnreferencedSourceIdsUseCase.execute.mockResolvedValue([drop1, drop2]);
    deleteSourcesUseCase.execute.mockResolvedValue(undefined);

    const result = await useCase.execute();

    expect(result).toEqual({
      scannedCount: 3,
      unreferencedCount: 2,
      deletedCount: 2,
      failedCount: 0,
      errors: [],
    });
    expect(findUnreferencedSourceIdsUseCase.execute).toHaveBeenCalledWith(
      expect.any(FindUnreferencedSourceIdsQuery),
    );
    const query = findUnreferencedSourceIdsUseCase.execute.mock.calls[0][0];
    expect(query.candidateIds).toEqual([keep, drop1, drop2]);
    expect(query.olderThan).toBeInstanceOf(Date);
    expect(deleteSourcesUseCase.execute).toHaveBeenCalledWith(
      expect.any(DeleteSourcesCommand),
    );
    const command = deleteSourcesUseCase.execute.mock.calls[0][0];
    expect(command.sourceIds).toEqual([drop1, drop2]);
  });

  it('records failed counts and per-source errors when the batch delete throws', async () => {
    const drop1 = randomUUID();
    const drop2 = randomUUID();
    threadsRepository.findSourceIdsWithOnlyStaleDirectAssignments.mockResolvedValue(
      [drop1, drop2],
    );
    findUnreferencedSourceIdsUseCase.execute.mockResolvedValue([drop1, drop2]);
    deleteSourcesUseCase.execute.mockRejectedValue(new Error('db offline'));

    const result = await useCase.execute();

    expect(result.scannedCount).toBe(2);
    expect(result.unreferencedCount).toBe(2);
    expect(result.deletedCount).toBe(0);
    expect(result.failedCount).toBe(2);
    expect(result.errors).toEqual<typeof result.errors>([
      { sourceId: drop1, error: 'db offline' },
      { sourceId: drop2, error: 'db offline' },
    ] satisfies { sourceId: UUID; error: string }[]);
  });

  it('passes a cutoff date approximately 30 days before now', async () => {
    const now = Date.now();
    threadsRepository.findSourceIdsWithOnlyStaleDirectAssignments.mockResolvedValue(
      [],
    );

    await useCase.execute();

    const cutoff =
      threadsRepository.findSourceIdsWithOnlyStaleDirectAssignments.mock
        .calls[0][0];
    const expected = now - 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs(cutoff.getTime() - expected)).toBeLessThan(5_000);
  });
});
