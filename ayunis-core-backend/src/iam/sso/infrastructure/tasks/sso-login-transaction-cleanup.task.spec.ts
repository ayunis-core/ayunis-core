import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { SsoLoginTransactionCleanupTask } from 'src/iam/sso/infrastructure/tasks/sso-login-transaction-cleanup.task';

describe(SsoLoginTransactionCleanupTask.name, () => {
  const repository = {
    save: jest.fn(),
    consume: jest.fn(),
    deleteExpired: jest.fn(),
  };
  const logger = createPinoLoggerMock();
  const task = new SsoLoginTransactionCleanupTask(logger, repository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes expired login transactions', async () => {
    repository.deleteExpired.mockResolvedValue(4);

    await task.handleCleanup();

    expect(repository.deleteExpired).toHaveBeenCalledWith(expect.any(Date));
  });

  it('does not fail the process when cleanup fails', async () => {
    repository.deleteExpired.mockRejectedValue(new Error('db unavailable'));

    await expect(task.handleCleanup()).resolves.toBeUndefined();
  });
});
