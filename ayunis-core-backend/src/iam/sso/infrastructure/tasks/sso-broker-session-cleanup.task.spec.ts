import { CronExpression } from '@nestjs/schedule';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { SsoBrokerSessionCleanupTask } from 'src/iam/sso/infrastructure/tasks/sso-broker-session-cleanup.task';

describe(SsoBrokerSessionCleanupTask.name, () => {
  const repository = {
    upsert: jest.fn(),
    findActiveByZitadelSessionId: jest.fn(),
    deleteExpired: jest.fn(),
  };
  const task = new SsoBrokerSessionCleanupTask(
    createPinoLoggerMock(),
    repository,
  );

  beforeEach(() => jest.clearAllMocks());

  it('removes expired broker session context daily', async () => {
    repository.deleteExpired.mockResolvedValue(2);

    await task.handleCleanup();

    expect(repository.deleteExpired).toHaveBeenCalledWith(expect.any(Date));
    const options = Reflect.getMetadata(
      'SCHEDULE_CRON_OPTIONS',
      SsoBrokerSessionCleanupTask.prototype.handleCleanup,
    ) as { cronTime: string } | undefined;
    expect(options?.cronTime).toBe(CronExpression.EVERY_DAY_AT_5AM);
  });

  it('does not fail the process when cleanup fails', async () => {
    repository.deleteExpired.mockRejectedValue(new Error('db unavailable'));

    await expect(task.handleCleanup()).resolves.toBeUndefined();
  });
});
