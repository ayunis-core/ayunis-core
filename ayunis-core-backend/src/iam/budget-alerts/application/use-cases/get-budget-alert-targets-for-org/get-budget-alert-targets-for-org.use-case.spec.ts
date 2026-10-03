import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { GetMonthlyCreditUsageUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage/get-monthly-credit-usage.use-case';
import { GetMonthlyCreditLimitUseCase } from 'src/iam/subscriptions/application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.use-case';
import { GetUserCreditLimitsOverviewUseCase } from 'src/iam/credit-limits/application/use-cases/get-user-credit-limits-overview/get-user-credit-limits-overview.use-case';
import { GetTeamCreditLimitsOverviewUseCase } from 'src/iam/credit-limits/application/use-cases/get-team-credit-limits-overview/get-team-credit-limits-overview.use-case';
import { GetApiKeyCreditLimitsOverviewUseCase } from 'src/iam/credit-limits/application/use-cases/get-api-key-credit-limits-overview/get-api-key-credit-limits-overview.use-case';
import { BudgetAlertScope } from 'src/iam/budget-alerts/domain/value-objects/budget-alert-scope.enum';
import { GetBudgetAlertTargetsForOrgQuery } from './get-budget-alert-targets-for-org.query';
import { GetBudgetAlertTargetsForOrgUseCase } from './get-budget-alert-targets-for-org.use-case';

describe('GetBudgetAlertTargetsForOrgUseCase', () => {
  let useCase: GetBudgetAlertTargetsForOrgUseCase;
  let creditLimit: { execute: jest.Mock };
  let orgUsage: { execute: jest.Mock };
  let userOverview: { execute: jest.Mock };
  let teamOverview: { execute: jest.Mock };
  let apiKeyOverview: { execute: jest.Mock };

  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const userId = '22222222-2222-2222-2222-222222222222' as UUID;
  const teamId = '33333333-3333-3333-3333-333333333333' as UUID;
  const apiKeyId = '44444444-4444-4444-4444-444444444444' as UUID;
  const startsAt = new Date('2026-07-10T00:00:00.000Z');

  beforeEach(async () => {
    creditLimit = {
      execute: jest.fn().mockResolvedValue({ monthlyCredits: 1000, startsAt }),
    };
    orgUsage = { execute: jest.fn().mockResolvedValue({ creditsUsed: 800 }) };
    userOverview = {
      execute: jest.fn().mockResolvedValue([
        {
          userId,
          name: 'Jane Doe',
          monthlyCredits: 200,
          creditsUsed: 120,
        },
      ]),
    };
    teamOverview = {
      execute: jest.fn().mockResolvedValue([
        {
          teamId,
          name: 'Engineering',
          monthlyCredits: 500,
          creditsUsed: 300,
        },
      ]),
    };

    apiKeyOverview = {
      execute: jest.fn().mockResolvedValue([
        {
          apiKeyId,
          name: 'Citizen portal',
          monthlyCredits: 400,
          creditsUsed: 330,
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBudgetAlertTargetsForOrgUseCase,
        { provide: GetMonthlyCreditLimitUseCase, useValue: creditLimit },
        { provide: GetMonthlyCreditUsageUseCase, useValue: orgUsage },
        {
          provide: GetUserCreditLimitsOverviewUseCase,
          useValue: userOverview,
        },
        {
          provide: GetTeamCreditLimitsOverviewUseCase,
          useValue: teamOverview,
        },
        {
          provide: GetApiKeyCreditLimitsOverviewUseCase,
          useValue: apiKeyOverview,
        },
      ],
    }).compile();

    useCase = module.get(GetBudgetAlertTargetsForOrgUseCase);
  });

  it('builds org, user, team, and API key targets over the windows enforcement uses', async () => {
    const result = await useCase.execute(
      new GetBudgetAlertTargetsForOrgQuery(orgId),
    );

    expect(result?.targets).toEqual([
      {
        scope: BudgetAlertScope.ORG,
        targetId: orgId,
        name: '',
        monthlyCredits: 1000,
        creditsUsed: 800,
      },
      {
        scope: BudgetAlertScope.USER,
        targetId: userId,
        name: 'Jane Doe',
        monthlyCredits: 200,
        creditsUsed: 120,
      },
      {
        scope: BudgetAlertScope.TEAM,
        targetId: teamId,
        name: 'Engineering',
        monthlyCredits: 500,
        creditsUsed: 300,
      },
      {
        scope: BudgetAlertScope.API_KEY,
        targetId: apiKeyId,
        name: 'Citizen portal',
        monthlyCredits: 400,
        creditsUsed: 330,
      },
    ]);
    expect(orgUsage.execute.mock.calls[0][0].since).toEqual(startsAt);
    // User, team and API key limits are enforced over the calendar month
    // (see CreditLimitGuardService, ApiKeyCreditLimitGuardService), so alerts
    // must not narrow the window to the subscription start.
    expect(userOverview.execute.mock.calls[0][0].since).toBeUndefined();
    expect(teamOverview.execute.mock.calls[0][0].since).toBeUndefined();
    expect(apiKeyOverview.execute.mock.calls[0][0].since).toBeUndefined();
    expect(apiKeyOverview.execute.mock.calls[0][0].onlyActiveKeys).toBe(true);
  });

  it('skips all usage reads without an active usage-based subscription', async () => {
    creditLimit.execute.mockResolvedValue({
      monthlyCredits: null,
      startsAt: null,
    });

    await expect(
      useCase.execute(new GetBudgetAlertTargetsForOrgQuery(orgId)),
    ).resolves.toBeNull();
    expect(orgUsage.execute).not.toHaveBeenCalled();
    expect(userOverview.execute).not.toHaveBeenCalled();
    expect(teamOverview.execute).not.toHaveBeenCalled();
    expect(apiKeyOverview.execute).not.toHaveBeenCalled();
  });
});
