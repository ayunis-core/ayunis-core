import type { UUID } from 'crypto';
import {
  ORPHANED_SOURCE_MIN_AGE_MS,
  SweepOrphanedSourcesUseCase,
} from './sweep-orphaned-sources.use-case';
import type { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import type { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';

describe(SweepOrphanedSourcesUseCase.name, () => {
  const now = new Date('2026-12-01T02:45:00Z');
  const org = '22222222-2222-2222-2222-222222222222' as UUID;
  const withKey = '00000000-0000-0000-0000-00000000000a' as UUID;
  const withKey2 = '00000000-0000-0000-0000-00000000000b' as UUID;
  const keyless = '00000000-0000-0000-0000-00000000000c' as UUID;

  let repo: { findOrphanedIds: jest.Mock; findByIds: jest.Mock };
  let deleteSources: { execute: jest.Mock };
  let useCase: SweepOrphanedSourcesUseCase;

  beforeEach(() => {
    repo = {
      findOrphanedIds: jest
        .fn()
        .mockResolvedValue([withKey, withKey2, keyless]),
      findByIds: jest.fn().mockResolvedValue([
        { id: withKey, storageKey: `${org}/uploads/s1/a.pdf` },
        { id: withKey2, storageKey: `${org}/uploads/s2/b.pdf` },
        { id: keyless, storageKey: null },
      ]),
    };
    deleteSources = { execute: jest.fn().mockResolvedValue(undefined) };
    useCase = new SweepOrphanedSourcesUseCase(
      repo as unknown as SourceRepository,
      deleteSources as unknown as DeleteSourcesUseCase,
    );
  });

  it('deletes month-old unreferenced sources, grouped by the org read from their original', async () => {
    await expect(useCase.execute(now)).resolves.toEqual({
      candidateCount: 3,
      deletedCount: 3,
      failedCount: 0,
    });

    expect(repo.findOrphanedIds).toHaveBeenCalledWith(
      new Date(now.getTime() - ORPHANED_SOURCE_MIN_AGE_MS),
      expect.any(Number),
    );
    expect(deleteSources.execute.mock.calls.map(([c]) => c)).toEqual([
      expect.objectContaining({ sourceIds: [withKey, withKey2], orgId: org }),
      expect.objectContaining({ sourceIds: [keyless], orgId: null }),
    ]);
  });

  it('counts a failed batch and keeps going', async () => {
    deleteSources.execute.mockRejectedValueOnce(new Error('index down'));

    await expect(useCase.execute(now)).resolves.toMatchObject({
      deletedCount: 1,
      failedCount: 2,
    });
  });

  it('does nothing when no source is orphaned', async () => {
    repo.findOrphanedIds.mockResolvedValue([]);

    await expect(useCase.execute(now)).resolves.toEqual({
      candidateCount: 0,
      deletedCount: 0,
      failedCount: 0,
    });
    expect(repo.findByIds).not.toHaveBeenCalled();
  });
});
