import { checkIn } from '@appsignal/nodejs';
import { createLoggerMock } from 'src/common/testing/logger.mock';
import { SessionsCleanupTask } from './sessions-cleanup.task';
import { createMockRefreshTokensRepository } from 'src/iam/sessions/application/testing/refresh-token.fixtures';

jest.mock('@appsignal/nodejs', () => ({
  checkIn: {
    cron: jest.fn(),
  },
}));

const cronMock = jest.mocked(checkIn.cron);

describe('SessionsCleanupTask', () => {
  let task: SessionsCleanupTask;
  let repository: ReturnType<typeof createMockRefreshTokensRepository>;
  let logger: ReturnType<typeof createLoggerMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    cronMock.mockImplementation((_identifier, callback) => callback());
    repository = createMockRefreshTokensRepository();
    logger = createLoggerMock();
    task = new SessionsCleanupTask(repository);
  });

  it('deletes expired tokens inside the sessions cleanup monitor', async () => {
    repository.deleteExpired.mockResolvedValue(5);

    await task.handleCleanup();

    expect(cronMock).toHaveBeenCalledWith(
      'sessions_cleanup',
      expect.any(Function),
    );
    expect(repository.deleteExpired).toHaveBeenCalledTimes(1);
  });

  it('logs cleanup results with object-first metadata', async () => {
    repository.deleteExpired.mockResolvedValue(5);

    await task.handleCleanup();

    expect(logger.log).toHaveBeenCalledWith(
      { deleted: 5 },
      'Scheduled sessions cleanup completed',
    );
  });

  it('leaves repository failures rejected inside the monitor while the task resolves', async () => {
    const failure = new Error('db down');
    repository.deleteExpired.mockRejectedValue(failure);

    await expect(task.handleCleanup()).resolves.toBeUndefined();

    await expect(cronMock.mock.results[0].value).rejects.toBe(failure);
    expect(logger.error).toHaveBeenCalledWith(
      { err: failure },
      'Scheduled sessions cleanup failed',
    );
  });

  it('does not monitor an overlapping skipped run', async () => {
    let finish!: () => void;
    repository.deleteExpired.mockReturnValue(
      new Promise((resolve) => {
        finish = () => resolve(0);
      }),
    );

    const firstRun = task.handleCleanup();
    await task.handleCleanup();

    expect(cronMock).toHaveBeenCalledTimes(1);

    finish();
    await firstRun;
  });
});
