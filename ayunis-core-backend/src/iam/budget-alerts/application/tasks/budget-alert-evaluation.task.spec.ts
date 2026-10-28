import { checkIn } from '@appsignal/nodejs';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ListUsageBasedSubscriptionOrgIdsUseCase } from 'src/iam/subscriptions/application/use-cases/list-usage-based-subscription-org-ids/list-usage-based-subscription-org-ids.use-case';
import { BudgetAlertEvaluator } from 'src/iam/budget-alerts/application/services/budget-alert-evaluator.service';
import { BudgetAlertEvaluationTask } from './budget-alert-evaluation.task';

jest.mock('@appsignal/nodejs', () => ({
  checkIn: {
    cron: jest.fn(),
  },
}));

const cronMock = jest.mocked(checkIn.cron);

describe('BudgetAlertEvaluationTask', () => {
  let task: BudgetAlertEvaluationTask;
  let listOrgIds: { execute: jest.Mock };
  let evaluator: { evaluate: jest.Mock };

  const orgA = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgB = '22222222-2222-2222-2222-222222222222' as UUID;

  beforeEach(async () => {
    jest.clearAllMocks();
    cronMock.mockImplementation((_identifier, callback) => callback());
    listOrgIds = { execute: jest.fn().mockResolvedValue([orgA, orgB]) };
    evaluator = { evaluate: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetAlertEvaluationTask,
        {
          provide: ListUsageBasedSubscriptionOrgIdsUseCase,
          useValue: listOrgIds,
        },
        { provide: BudgetAlertEvaluator, useValue: evaluator },
      ],
    }).compile();

    task = module.get(BudgetAlertEvaluationTask);
  });

  it('evaluates every org with an active usage-based subscription', async () => {
    await task.handleDailyEvaluation();

    expect(cronMock).toHaveBeenCalledWith(
      'budget_alert_evaluation',
      expect.any(Function),
    );
    expect(evaluator.evaluate).toHaveBeenCalledTimes(2);
    expect(evaluator.evaluate).toHaveBeenNthCalledWith(1, orgA);
    expect(evaluator.evaluate).toHaveBeenNthCalledWith(2, orgB);
  });

  it('evaluates nothing when no org has a usage-based subscription', async () => {
    listOrgIds.execute.mockResolvedValue([]);

    await task.handleDailyEvaluation();

    expect(evaluator.evaluate).not.toHaveBeenCalled();
  });

  it('keeps listing failures rejected inside the monitor but catches them outside', async () => {
    const failure = new Error('db down');
    listOrgIds.execute.mockRejectedValue(failure);

    await expect(task.handleDailyEvaluation()).resolves.toBeUndefined();

    await expect(cronMock.mock.results[0].value).rejects.toBe(failure);
    expect(evaluator.evaluate).not.toHaveBeenCalled();
  });
});
