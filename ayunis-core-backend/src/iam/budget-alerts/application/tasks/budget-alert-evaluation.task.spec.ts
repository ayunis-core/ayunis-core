import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ListUsageBasedSubscriptionOrgIdsUseCase } from 'src/iam/subscriptions/application/use-cases/list-usage-based-subscription-org-ids/list-usage-based-subscription-org-ids.use-case';
import { BudgetAlertEvaluator } from '../services/budget-alert-evaluator.service';
import { BudgetAlertEvaluationTask } from './budget-alert-evaluation.task';

describe('BudgetAlertEvaluationTask', () => {
  let task: BudgetAlertEvaluationTask;
  let listOrgIds: { execute: jest.Mock };
  let evaluator: { evaluate: jest.Mock };

  const orgA = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgB = '22222222-2222-2222-2222-222222222222' as UUID;

  beforeEach(async () => {
    listOrgIds = { execute: jest.fn().mockResolvedValue([orgA, orgB]) };
    evaluator = { evaluate: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetAlertEvaluationTask,
        {
          provide: getLoggerToken(BudgetAlertEvaluationTask.name),
          useValue: createPinoLoggerMock(),
        },
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

    expect(evaluator.evaluate).toHaveBeenCalledTimes(2);
    expect(evaluator.evaluate).toHaveBeenNthCalledWith(1, orgA);
    expect(evaluator.evaluate).toHaveBeenNthCalledWith(2, orgB);
  });

  it('evaluates nothing when no org has a usage-based subscription', async () => {
    listOrgIds.execute.mockResolvedValue([]);

    await task.handleDailyEvaluation();

    expect(evaluator.evaluate).not.toHaveBeenCalled();
  });

  it('never rejects when listing the orgs fails', async () => {
    listOrgIds.execute.mockRejectedValue(new Error('db down'));

    await expect(task.handleDailyEvaluation()).resolves.toBeUndefined();
    expect(evaluator.evaluate).not.toHaveBeenCalled();
  });
});
