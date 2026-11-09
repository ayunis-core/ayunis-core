import {
  SweepUnreferencedOriginalsUseCase,
  UNREFERENCED_ORIGINAL_MIN_AGE_MS,
} from './sweep-unreferenced-originals.use-case';
import type { ListObjectSummariesUseCase } from 'src/domain/storage/application/use-cases/list-object-summaries/list-object-summaries.use-case';
import type { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import type { SourceUploadStorageCleanupService } from 'src/domain/sources/application/services/source-upload-storage-cleanup.service';

describe(SweepUnreferencedOriginalsUseCase.name, () => {
  const now = new Date('2026-11-20T02:30:00Z');
  const old = new Date(now.getTime() - UNREFERENCED_ORIGINAL_MIN_AGE_MS - 1);
  const fresh = new Date(now.getTime() - 60 * 60 * 1000);
  const orphan = 'org/uploads/s1/orphan.pdf';
  const kept = 'org/uploads/s2/kept.pdf';
  const recent = 'org/uploads/s3/recent.pdf';
  const unrelated = 'org/processing/src/file.pdf';

  let list: { execute: jest.Mock };
  let sources: { findReferencedStorageKeys: jest.Mock };
  let cleanup: { remove: jest.Mock };
  let useCase: SweepUnreferencedOriginalsUseCase;

  beforeEach(() => {
    list = {
      execute: jest.fn().mockResolvedValue([
        { objectName: orphan, lastModified: old },
        { objectName: kept, lastModified: old },
        { objectName: recent, lastModified: fresh },
        { objectName: unrelated, lastModified: old },
      ]),
    };
    sources = {
      findReferencedStorageKeys: jest.fn().mockResolvedValue([kept]),
    };
    cleanup = { remove: jest.fn().mockResolvedValue(true) };
    useCase = new SweepUnreferencedOriginalsUseCase(
      list as unknown as ListObjectSummariesUseCase,
      sources as unknown as SourceRepository,
      cleanup as unknown as SourceUploadStorageCleanupService,
    );
  });

  it('removes old upload originals no source references and leaves the rest', async () => {
    await expect(useCase.execute(now)).resolves.toEqual({
      candidateCount: 2,
      deletedCount: 1,
      failedCount: 0,
    });

    expect(sources.findReferencedStorageKeys).toHaveBeenCalledWith([
      orphan,
      kept,
    ]);
    expect(cleanup.remove.mock.calls).toEqual([[orphan]]);
  });

  it('counts a failed delete so the next run retries it', async () => {
    cleanup.remove.mockResolvedValue(false);

    await expect(useCase.execute(now)).resolves.toMatchObject({
      deletedCount: 0,
      failedCount: 1,
    });
  });

  it('does nothing when nothing is old enough', async () => {
    list.execute.mockResolvedValue([
      { objectName: orphan, lastModified: fresh },
    ]);

    await expect(useCase.execute(now)).resolves.toEqual({
      candidateCount: 0,
      deletedCount: 0,
      failedCount: 0,
    });
    expect(sources.findReferencedStorageKeys).not.toHaveBeenCalled();
  });
});
