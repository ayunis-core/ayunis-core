import { Logger } from '@nestjs/common';
import { SessionsCleanupTask } from './sessions-cleanup.task';
import { createMockRefreshTokensRepository } from '../../application/testing/refresh-token.fixtures';

describe('SessionsCleanupTask', () => {
  let task: SessionsCleanupTask;
  let repository: ReturnType<typeof createMockRefreshTokensRepository>;

  beforeEach(() => {
    repository = createMockRefreshTokensRepository();
    task = new SessionsCleanupTask(repository);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('should delete expired tokens', async () => {
    repository.deleteExpired.mockResolvedValue(5);

    await task.handleCleanup();

    expect(repository.deleteExpired).toHaveBeenCalledTimes(1);
  });

  it('should swallow repository errors', async () => {
    repository.deleteExpired.mockRejectedValue(new Error('db down'));

    await expect(task.handleCleanup()).resolves.toBeUndefined();
  });
});
