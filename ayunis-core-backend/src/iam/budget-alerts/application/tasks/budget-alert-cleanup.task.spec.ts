import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CleanupBudgetAlertNotificationsUseCase } from '../use-cases/cleanup-budget-alert-notifications/cleanup-budget-alert-notifications.use-case';
import { BudgetAlertCleanupTask } from './budget-alert-cleanup.task';

describe('BudgetAlertCleanupTask', () => {
  let task: BudgetAlertCleanupTask;
  let cleanup: { execute: jest.Mock };

  beforeEach(async () => {
    cleanup = { execute: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetAlertCleanupTask,
        {
          provide: CleanupBudgetAlertNotificationsUseCase,
          useValue: cleanup,
        },
      ],
    }).compile();

    task = module.get(BudgetAlertCleanupTask);
  });

  it('purges expired notifications', async () => {
    await task.handleCleanup();

    expect(cleanup.execute).toHaveBeenCalledTimes(1);
  });

  it('never rejects when the purge fails', async () => {
    cleanup.execute.mockRejectedValue(new Error('boom'));

    await expect(task.handleCleanup()).resolves.toBeUndefined();
  });
});
