import { createLoggerMock } from 'src/common/testing/logger.mock';
import { SessionsCleanupTask } from './sessions-cleanup.task';
import { createMockRefreshTokensRepository } from 'src/iam/sessions/application/testing/refresh-token.fixtures';

describe('SessionsCleanupTask', () => {
  let task: SessionsCleanupTask;
  let repository: ReturnType<typeof createMockRefreshTokensRepository>;
  let logger: ReturnType<typeof createLoggerMock>;

  beforeEach(() => {
    repository = createMockRefreshTokensRepository();
    logger = createLoggerMock();
    task = new SessionsCleanupTask(repository);
  });

  afterEach(() => jest.clearAllMocks());

  it('should delete expired tokens', async () => {
    repository.deleteExpired.mockResolvedValue(5);

    await task.handleCleanup();

    expect(repository.deleteExpired).toHaveBeenCalledTimes(1);
  });

  it('should log cleanup results with object-first metadata', async () => {
    repository.deleteExpired.mockResolvedValue(5);

    await task.handleCleanup();

    expect(logger.log).toHaveBeenCalledWith(
      { deleted: 5 },
      'Scheduled sessions cleanup completed',
    );
  });

  it('should swallow repository errors', async () => {
    repository.deleteExpired.mockRejectedValue(new Error('db down'));

    await expect(task.handleCleanup()).resolves.toBeUndefined();
  });
});
