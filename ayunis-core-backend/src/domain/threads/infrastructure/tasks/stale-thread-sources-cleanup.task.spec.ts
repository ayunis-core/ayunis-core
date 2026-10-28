import { checkIn } from '@appsignal/nodejs';
import { createLoggerMock } from 'src/common/testing/logger.mock';
import type { CleanupStaleThreadSourcesUseCase } from 'src/domain/threads/application/use-cases/cleanup-stale-thread-sources/cleanup-stale-thread-sources.use-case';
import type { CleanupStaleThreadSourcesResult } from 'src/domain/threads/application/use-cases/cleanup-stale-thread-sources/cleanup-stale-thread-sources.result';
import { StaleThreadSourcesCleanupTask } from './stale-thread-sources-cleanup.task';

jest.mock('@appsignal/nodejs', () => ({
  checkIn: {
    cron: jest.fn(),
  },
}));

const cronMock = jest.mocked(checkIn.cron);

const successfulCleanup: CleanupStaleThreadSourcesResult = {
  scannedCount: 4,
  unreferencedCount: 3,
  deletedCount: 3,
  failedCount: 0,
  errors: [],
};

describe('StaleThreadSourcesCleanupTask', () => {
  let execute: jest.Mock;
  let task: StaleThreadSourcesCleanupTask;
  let logger: ReturnType<typeof createLoggerMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    cronMock.mockImplementation((_identifier, callback) => callback());
    execute = jest.fn().mockResolvedValue(successfulCleanup);
    logger = createLoggerMock();
    task = new StaleThreadSourcesCleanupTask({
      execute,
    } as unknown as CleanupStaleThreadSourcesUseCase);
  });

  it('runs the cleanup inside the stale thread sources monitor', async () => {
    await task.handleCleanup();

    expect(cronMock).toHaveBeenCalledWith(
      'stale_thread_sources_cleanup',
      expect.any(Function),
    );
    expect(execute).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith(
      { scanned: 4, unreferenced: 3, deleted: 3, failed: 0 },
      'Scheduled cleanup completed',
    );
  });

  it('warns about partial failures without failing the monitor', async () => {
    const errors = [{ sourceId: 'source-1', error: 'db offline' }];
    execute.mockResolvedValue({
      ...successfulCleanup,
      failedCount: 1,
      errors,
    });

    await task.handleCleanup();

    await expect(cronMock.mock.results[0].value).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      { error: errors },
      'Some sources failed to delete',
    );
  });

  it('leaves failures rejected inside the monitor while preserving the outer catch', async () => {
    const failure = new Error('relation does not exist');
    execute.mockRejectedValue(failure);

    await expect(task.handleCleanup()).resolves.toBeUndefined();

    await expect(cronMock.mock.results[0].value).rejects.toBe(failure);
    expect(logger.error).toHaveBeenCalledWith(
      { err: failure },
      'Scheduled cleanup failed',
    );
  });

  it('does not monitor an overlapping skipped run', async () => {
    let finish!: () => void;
    execute.mockReturnValue(
      new Promise((resolve) => {
        finish = () => resolve(successfulCleanup);
      }),
    );

    const firstRun = task.handleCleanup();
    await task.handleCleanup();

    expect(cronMock).toHaveBeenCalledTimes(1);

    finish();
    await firstRun;
  });
});
