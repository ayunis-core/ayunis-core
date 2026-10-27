import { checkIn } from '@appsignal/nodejs';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ProcessExpiredSubscriptionsUseCase } from 'src/iam/subscriptions/application/use-cases/process-expired-subscriptions/process-expired-subscriptions.use-case';
import { SubscriptionExpirySweepTask } from './subscription-expiry-sweep.task';

jest.mock('@appsignal/nodejs', () => ({
  checkIn: {
    cron: jest.fn(),
  },
}));

const cronMock = jest.mocked(checkIn.cron);

describe('SubscriptionExpirySweepTask', () => {
  let task: SubscriptionExpirySweepTask;
  let processExpired: { execute: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    cronMock.mockImplementation((_identifier, callback) => callback());
    processExpired = { execute: jest.fn().mockResolvedValue(1) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionExpirySweepTask,
        {
          provide: ProcessExpiredSubscriptionsUseCase,
          useValue: processExpired,
        },
      ],
    }).compile();

    task = module.get(SubscriptionExpirySweepTask);
  });

  it('runs the expiry processing inside the AppSignal cron check-in', async () => {
    await task.handleDailySweep();

    expect(cronMock).toHaveBeenCalledWith(
      'subscription_expiry_sweep',
      expect.any(Function),
    );
    expect(processExpired.execute).toHaveBeenCalledTimes(1);
  });

  it('keeps failures rejected inside the monitor but catches them outside', async () => {
    const failure = new Error('db down');
    processExpired.execute.mockRejectedValue(failure);

    await expect(task.handleDailySweep()).resolves.toBeUndefined();

    await expect(cronMock.mock.results[0].value).rejects.toBe(failure);
  });
});
