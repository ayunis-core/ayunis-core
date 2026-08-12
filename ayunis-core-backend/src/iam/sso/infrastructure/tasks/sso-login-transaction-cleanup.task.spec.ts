import { Logger } from '@nestjs/common';
import { SsoLoginTransactionCleanupTask } from 'src/iam/sso/infrastructure/tasks/sso-login-transaction-cleanup.task';

describe(SsoLoginTransactionCleanupTask.name, () => {
  const repository = {
    save: jest.fn(),
    consume: jest.fn(),
    deleteExpired: jest.fn(),
  };
  const task = new SsoLoginTransactionCleanupTask(repository);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
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
