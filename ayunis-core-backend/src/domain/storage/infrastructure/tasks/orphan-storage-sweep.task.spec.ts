import { checkIn } from '@appsignal/nodejs';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { SweepOrphanStorageUseCase } from '../../application/use-cases/sweep-orphan-storage/sweep-orphan-storage.use-case';
import { OrphanStorageSweepTask } from './orphan-storage-sweep.task';

jest.mock('@appsignal/nodejs', () => ({
  checkIn: {
    cron: jest.fn(),
  },
}));

const cronMock = jest.mocked(checkIn.cron);

const successfulSweep = {
  storageOrgCount: 4,
  orphanOrgCount: 1,
  purgedOrgCount: 1,
  skippedRecentOrgCount: 0,
  deletedObjectCount: 6,
  failedObjectCount: 0,
};

describe('OrphanStorageSweepTask', () => {
  let execute: jest.Mock;
  let task: OrphanStorageSweepTask;

  beforeEach(() => {
    jest.clearAllMocks();
    cronMock.mockImplementation((_identifier, callback) => callback());
    execute = jest.fn().mockResolvedValue(successfulSweep);
    task = new OrphanStorageSweepTask(createPinoLoggerMock(), {
      execute,
    } as unknown as SweepOrphanStorageUseCase);
  });

  it('executes the sweep inside the orphan storage monitor', async () => {
    await task.handleSweep();

    expect(cronMock).toHaveBeenCalledWith(
      'orphan_storage_sweep',
      expect.any(Function),
    );
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('leaves failures rejected inside the monitor while preserving the outer catch', async () => {
    const failure = new Error('object storage unavailable');
    execute.mockRejectedValue(failure);

    await expect(task.handleSweep()).resolves.toBeUndefined();

    await expect(cronMock.mock.results[0].value).rejects.toBe(failure);
  });

  it('does not monitor an overlapping skipped run', async () => {
    let finish!: () => void;
    execute.mockReturnValue(
      new Promise((resolve) => {
        finish = () => resolve(successfulSweep);
      }),
    );

    const firstRun = task.handleSweep();
    await task.handleSweep();

    expect(cronMock).toHaveBeenCalledTimes(1);

    finish();
    await firstRun;
  });
});
