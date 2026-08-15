import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { PasswordSetTokenCleanupTask } from './password-set-token-cleanup.task';
import { createMockPasswordSetTokensRepository } from '../../application/testing/password-set-token.fixtures';

describe('PasswordSetTokenCleanupTask', () => {
  let task: PasswordSetTokenCleanupTask;
  let repository: ReturnType<typeof createMockPasswordSetTokensRepository>;

  beforeEach(() => {
    repository = createMockPasswordSetTokensRepository();
    task = new PasswordSetTokenCleanupTask(createPinoLoggerMock(), repository);
  });

  afterEach(() => jest.clearAllMocks());

  it('should delete expired or used tokens', async () => {
    repository.deleteExpiredOrUsed.mockResolvedValue(3);

    await task.handleCleanup();

    expect(repository.deleteExpiredOrUsed).toHaveBeenCalledTimes(1);
  });

  it('should swallow repository errors', async () => {
    repository.deleteExpiredOrUsed.mockRejectedValue(new Error('db down'));

    await expect(task.handleCleanup()).resolves.toBeUndefined();
  });
});
