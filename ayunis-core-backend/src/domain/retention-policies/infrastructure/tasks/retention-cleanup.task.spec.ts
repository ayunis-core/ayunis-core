import { checkIn } from '@appsignal/nodejs';
import type { EnforceRetentionUseCase } from 'src/domain/retention-policies/application/use-cases/enforce-retention/enforce-retention.use-case';
import { RetentionCleanupTask } from './retention-cleanup.task';

jest.mock('@appsignal/nodejs', () => ({
  checkIn: {
    cron: jest.fn(),
  },
}));

const cronMock = jest.mocked(checkIn.cron);

describe('RetentionCleanupTask', () => {
  let execute: jest.Mock;
  let task: RetentionCleanupTask;

  beforeEach(() => {
    jest.clearAllMocks();
    cronMock.mockImplementation((_identifier, callback) => callback());
    execute = jest.fn().mockResolvedValue({
      orgsProcessed: 2,
      totalDeleted: 8,
      totalFailed: 0,
      dryRun: false,
      perOrg: [],
    });
    task = new RetentionCleanupTask({
      execute,
    } as unknown as EnforceRetentionUseCase);
  });

  it('executes retention enforcement inside the retention monitor', async () => {
    await task.handleCleanup();

    expect(cronMock).toHaveBeenCalledWith(
      'retention_cleanup',
      expect.any(Function),
    );
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('leaves failures rejected inside the monitor while preserving the outer catch', async () => {
    const failure = new Error('retention database unavailable');
    execute.mockRejectedValue(failure);

    await expect(task.handleCleanup()).resolves.toBeUndefined();

    await expect(cronMock.mock.results[0].value).rejects.toBe(failure);
  });

  it('does not monitor an overlapping skipped run', async () => {
    let finish!: () => void;
    execute.mockReturnValue(
      new Promise((resolve) => {
        finish = () =>
          resolve({
            orgsProcessed: 0,
            totalDeleted: 0,
            totalFailed: 0,
            dryRun: false,
            perOrg: [],
          });
      }),
    );

    const firstRun = task.handleCleanup();
    await task.handleCleanup();

    expect(cronMock).toHaveBeenCalledTimes(1);

    finish();
    await firstRun;
  });
});
