import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import type { BudgetTarget } from '../../utils/budget-alert-crossing';
import { GetBudgetAlertTargetsForOrgUseCase } from '../get-budget-alert-targets-for-org/get-budget-alert-targets-for-org.use-case';
import { ProcessBudgetAlertCrossingsUseCase } from '../process-budget-alert-crossings/process-budget-alert-crossings.use-case';
import { EvaluateBudgetAlertsForOrgQuery } from './evaluate-budget-alerts-for-org.query';
import { EvaluateBudgetAlertsForOrgUseCase } from './evaluate-budget-alerts-for-org.use-case';

describe('EvaluateBudgetAlertsForOrgUseCase', () => {
  let useCase: EvaluateBudgetAlertsForOrgUseCase;
  let getTargets: { execute: jest.Mock };
  let processCrossings: { execute: jest.Mock };

  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const targets: BudgetTarget[] = [];
  const periodStart = new Date('2026-07-01T00:00:00.000Z');

  beforeEach(async () => {
    getTargets = {
      execute: jest.fn().mockResolvedValue({ periodStart, targets }),
    };
    processCrossings = { execute: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluateBudgetAlertsForOrgUseCase,
        {
          provide: GetBudgetAlertTargetsForOrgUseCase,
          useValue: getTargets,
        },
        {
          provide: ProcessBudgetAlertCrossingsUseCase,
          useValue: processCrossings,
        },
      ],
    }).compile();

    useCase = module.get(EvaluateBudgetAlertsForOrgUseCase);
  });

  it('delegates target lookup and crossing processing', async () => {
    await useCase.execute(new EvaluateBudgetAlertsForOrgQuery(orgId));

    expect(getTargets.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId }),
    );
    expect(processCrossings.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId, periodStart, targets }),
    );
  });

  it('does not process targets for organizations without a usage subscription', async () => {
    getTargets.execute.mockResolvedValue(null);

    await useCase.execute(new EvaluateBudgetAlertsForOrgQuery(orgId));

    expect(processCrossings.execute).not.toHaveBeenCalled();
  });
});
