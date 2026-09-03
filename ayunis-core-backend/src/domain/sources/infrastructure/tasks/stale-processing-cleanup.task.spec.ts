import type { UUID } from 'crypto';
import type { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import type { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { StaleProcessingCleanupTask } from './stale-processing-cleanup.task';

const STUCK_PDF_SOURCE_ID = '3f1d2b40-9c1e-4a7b-8a2f-5e6d7c8b9a01' as UUID;
const STUCK_CRAWL_SOURCE_ID = '7a9c4e21-1b3d-4f5a-9c8e-2d4f6a8b0c13' as UUID;

const sourceRepository = {
  findStaleProcessingSourceIds: jest.fn(),
};

const markSourceFailedUseCase = {
  execute: jest.fn(),
};

describe('StaleProcessingCleanupTask', () => {
  let task: StaleProcessingCleanupTask;

  beforeEach(() => {
    jest.clearAllMocks();
    task = new StaleProcessingCleanupTask(
      sourceRepository as unknown as SourceRepository,
      markSourceFailedUseCase as unknown as MarkSourceFailedUseCase,
    );
  });

  it('marks every stale source as failed with a timeout message', async () => {
    sourceRepository.findStaleProcessingSourceIds.mockResolvedValue([
      STUCK_PDF_SOURCE_ID,
      STUCK_CRAWL_SOURCE_ID,
    ]);
    markSourceFailedUseCase.execute.mockResolvedValue(undefined);

    await task.handleCleanup();

    expect(markSourceFailedUseCase.execute).toHaveBeenCalledTimes(2);
    expect(markSourceFailedUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: STUCK_PDF_SOURCE_ID,
        errorMessage: 'Processing timed out',
      }),
    );
    expect(markSourceFailedUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: STUCK_CRAWL_SOURCE_ID }),
    );
  });

  it('queries with a bounded batch size', async () => {
    sourceRepository.findStaleProcessingSourceIds.mockResolvedValue([]);

    await task.handleCleanup();

    expect(sourceRepository.findStaleProcessingSourceIds).toHaveBeenCalledWith(
      expect.any(Date),
      100,
    );
  });

  it('does not mark anything when no sources are stale', async () => {
    sourceRepository.findStaleProcessingSourceIds.mockResolvedValue([]);

    await task.handleCleanup();

    expect(markSourceFailedUseCase.execute).not.toHaveBeenCalled();
  });

  it('continues marking remaining sources when one fails', async () => {
    sourceRepository.findStaleProcessingSourceIds.mockResolvedValue([
      STUCK_PDF_SOURCE_ID,
      STUCK_CRAWL_SOURCE_ID,
    ]);
    markSourceFailedUseCase.execute
      .mockRejectedValueOnce(new Error('optimistic lock conflict'))
      .mockResolvedValueOnce(undefined);

    await expect(task.handleCleanup()).resolves.toBeUndefined();

    expect(markSourceFailedUseCase.execute).toHaveBeenCalledTimes(2);
    expect(markSourceFailedUseCase.execute).toHaveBeenLastCalledWith(
      expect.objectContaining({ sourceId: STUCK_CRAWL_SOURCE_ID }),
    );
  });

  it('does not throw when the stale-source query fails', async () => {
    sourceRepository.findStaleProcessingSourceIds.mockRejectedValue(
      new Error('connection terminated unexpectedly'),
    );

    await expect(task.handleCleanup()).resolves.toBeUndefined();

    expect(markSourceFailedUseCase.execute).not.toHaveBeenCalled();
  });

  it('skips a run while the previous one is still in flight', async () => {
    let finishQuery!: (ids: UUID[]) => void;
    sourceRepository.findStaleProcessingSourceIds.mockReturnValue(
      new Promise<UUID[]>((resolve) => {
        finishQuery = resolve;
      }),
    );

    const firstRun = task.handleCleanup();
    await task.handleCleanup();

    expect(sourceRepository.findStaleProcessingSourceIds).toHaveBeenCalledTimes(
      1,
    );

    finishQuery([]);
    await firstRun;
  });

  it('runs again after a previous run has completed', async () => {
    sourceRepository.findStaleProcessingSourceIds.mockResolvedValue([]);

    await task.handleCleanup();
    await task.handleCleanup();

    expect(sourceRepository.findStaleProcessingSourceIds).toHaveBeenCalledTimes(
      2,
    );
  });
});
