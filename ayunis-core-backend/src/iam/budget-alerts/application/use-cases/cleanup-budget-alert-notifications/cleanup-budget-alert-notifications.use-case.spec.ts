import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { BudgetAlertNotificationRepository } from '../../ports/budget-alert-notification.repository';
import { UnexpectedBudgetAlertError } from '../../budget-alerts.errors';
import { CleanupBudgetAlertNotificationsUseCase } from './cleanup-budget-alert-notifications.use-case';

describe('CleanupBudgetAlertNotificationsUseCase', () => {
  let useCase: CleanupBudgetAlertNotificationsUseCase;
  let repository: { deleteBefore: jest.Mock };

  beforeEach(async () => {
    repository = { deleteBefore: jest.fn().mockResolvedValue(3) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupBudgetAlertNotificationsUseCase,
        { provide: BudgetAlertNotificationRepository, useValue: repository },
      ],
    }).compile();

    useCase = module.get(CleanupBudgetAlertNotificationsUseCase);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deletes notifications from periods older than the retention window', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-13T04:00:00.000Z'));

    const deleted = await useCase.execute();

    expect(deleted).toBe(3);
    expect(repository.deleteBefore).toHaveBeenCalledWith(
      new Date(Date.UTC(2025, 6, 1)),
    );
  });

  it('aligns the cutoff to a UTC month start across year boundaries', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-01T00:00:00.000Z'));

    await useCase.execute();

    expect(repository.deleteBefore).toHaveBeenCalledWith(
      new Date(Date.UTC(2025, 1, 1)),
    );
  });

  it('wraps repository failures in UnexpectedBudgetAlertError', async () => {
    repository.deleteBefore.mockRejectedValue(new Error('db down'));

    await expect(useCase.execute()).rejects.toBeInstanceOf(
      UnexpectedBudgetAlertError,
    );
  });
});
