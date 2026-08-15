import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { SessionsCleanupTask } from './sessions-cleanup.task';
import { createMockRefreshTokensRepository } from '../../application/testing/refresh-token.fixtures';

describe('SessionsCleanupTask', () => {
  let task: SessionsCleanupTask;
  let repository: ReturnType<typeof createMockRefreshTokensRepository>;
  let logger: ReturnType<typeof createPinoLoggerMock>;

  beforeEach(() => {
    repository = createMockRefreshTokensRepository();
    logger = createPinoLoggerMock();
    task = new SessionsCleanupTask(logger, repository);
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

    expect(logger.info).toHaveBeenCalledWith(
      { deleted: 5 },
      'Scheduled sessions cleanup completed',
    );
  });

  it('should swallow repository errors', async () => {
    repository.deleteExpired.mockRejectedValue(new Error('db down'));

    await expect(task.handleCleanup()).resolves.toBeUndefined();
  });
});
