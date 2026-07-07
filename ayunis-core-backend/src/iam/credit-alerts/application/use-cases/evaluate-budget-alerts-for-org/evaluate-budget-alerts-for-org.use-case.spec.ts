import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { GetMonthlyCreditLimitUseCase } from 'src/iam/subscriptions/application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.use-case';
import { GetMonthlyCreditUsageUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage/get-monthly-credit-usage.use-case';
import { GetUserCreditLimitsOverviewUseCase } from 'src/iam/credit-limits/application/use-cases/get-user-credit-limits-overview/get-user-credit-limits-overview.use-case';
import { GetTeamCreditLimitsOverviewUseCase } from 'src/iam/credit-limits/application/use-cases/get-team-credit-limits-overview/get-team-credit-limits-overview.use-case';
import { GetOrgAdminsUseCase } from 'src/iam/users/application/use-cases/get-org-admins/get-org-admins.use-case';
import { SendBudgetWarningEmailUseCase } from '../send-budget-warning-email/send-budget-warning-email.use-case';
import { BudgetAlertNotificationRepository } from '../../ports/budget-alert-notification.repository';
import { BudgetAlertScope } from '../../../domain/value-objects/budget-alert-scope.enum';
import { notificationKey } from '../../budget-alert-crossing';
import { EvaluateBudgetAlertsForOrgUseCase } from './evaluate-budget-alerts-for-org.use-case';
import { EvaluateBudgetAlertsForOrgQuery } from './evaluate-budget-alerts-for-org.query';

const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
const adminId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as UUID;

describe('EvaluateBudgetAlertsForOrgUseCase', () => {
  let useCase: EvaluateBudgetAlertsForOrgUseCase;
  let creditLimit: { execute: jest.Mock };
  let orgUsage: { execute: jest.Mock };
  let userOverview: { execute: jest.Mock };
  let teamOverview: { execute: jest.Mock };
  let orgAdmins: { execute: jest.Mock };
  let sendEmail: { execute: jest.Mock };
  let repository: jest.Mocked<BudgetAlertNotificationRepository>;

  beforeEach(async () => {
    creditLimit = {
      execute: jest
        .fn()
        .mockResolvedValue({ monthlyCredits: 1000, startsAt: null }),
    };
    orgUsage = { execute: jest.fn().mockResolvedValue({ creditsUsed: 0 }) };
    userOverview = { execute: jest.fn().mockResolvedValue([]) };
    teamOverview = { execute: jest.fn().mockResolvedValue([]) };
    orgAdmins = {
      execute: jest
        .fn()
        .mockResolvedValue([
          { id: adminId, name: 'Andrea Admin', email: 'andrea@example.de' },
        ]),
    };
    sendEmail = { execute: jest.fn().mockResolvedValue(undefined) };
    repository = {
      findByOrgAndPeriod: jest.fn().mockResolvedValue([]),
      record: jest.fn().mockResolvedValue(undefined),
    };
    const context = {
      run: jest.fn((cb: () => Promise<void>) => cb()),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluateBudgetAlertsForOrgUseCase,
        { provide: ContextService, useValue: context },
        { provide: GetMonthlyCreditLimitUseCase, useValue: creditLimit },
        { provide: GetMonthlyCreditUsageUseCase, useValue: orgUsage },
        { provide: GetUserCreditLimitsOverviewUseCase, useValue: userOverview },
        { provide: GetTeamCreditLimitsOverviewUseCase, useValue: teamOverview },
        { provide: GetOrgAdminsUseCase, useValue: orgAdmins },
        { provide: SendBudgetWarningEmailUseCase, useValue: sendEmail },
        { provide: BudgetAlertNotificationRepository, useValue: repository },
      ],
    }).compile();

    useCase = module.get(EvaluateBudgetAlertsForOrgUseCase);
  });

  const run = () => useCase.execute(new EvaluateBudgetAlertsForOrgQuery(orgId));

  it('does nothing for an org without a usage-based subscription', async () => {
    creditLimit.execute.mockResolvedValue({
      monthlyCredits: null,
      startsAt: null,
    });

    await run();

    expect(orgAdmins.execute).not.toHaveBeenCalled();
    expect(sendEmail.execute).not.toHaveBeenCalled();
    expect(repository.record).not.toHaveBeenCalled();
  });

  it('emails admins and records 50 + 80 when the org budget jumps past 80%', async () => {
    orgUsage.execute.mockResolvedValue({ creditsUsed: 830 });

    await run();

    expect(sendEmail.execute).toHaveBeenCalledTimes(1);
    const command = sendEmail.execute.mock.calls[0][0];
    expect(command.scope).toBe('org');
    expect(command.threshold).toBe(80);
    expect(command.recipientEmail).toBe('andrea@example.de');

    const recordedThresholds = repository.record.mock.calls.map(
      (call) => (call[0] as { threshold: number }).threshold,
    );
    expect(recordedThresholds).toEqual([50, 80]);
  });

  it('skips a crossing already recorded for the period', async () => {
    orgUsage.execute.mockResolvedValue({ creditsUsed: 830 });
    repository.findByOrgAndPeriod.mockResolvedValue([
      {
        scope: BudgetAlertScope.ORG,
        targetId: orgId,
        threshold: 50,
      },
      {
        scope: BudgetAlertScope.ORG,
        targetId: orgId,
        threshold: 80,
      },
    ] as never);

    await run();

    expect(sendEmail.execute).not.toHaveBeenCalled();
    expect(repository.record).not.toHaveBeenCalled();
  });

  it('warns about a per-user limit crossing', async () => {
    const userId = '22222222-2222-2222-2222-222222222222' as UUID;
    userOverview.execute.mockResolvedValue([
      {
        userId,
        name: 'Jane Doe',
        email: 'jane@example.de',
        monthlyCredits: 200,
        creditsUsed: 120,
      },
    ]);

    await run();

    expect(sendEmail.execute).toHaveBeenCalledTimes(1);
    const command = sendEmail.execute.mock.calls[0][0];
    expect(command.scope).toBe('user');
    expect(command.targetName).toBe('Jane Doe');
    expect(command.threshold).toBe(50);
    expect(repository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: BudgetAlertScope.USER,
        targetId: userId,
        threshold: 50,
      }),
    );
  });

  it('references the notification key helper for dedup coverage', () => {
    expect(notificationKey(BudgetAlertScope.ORG, orgId, 80)).toBe(
      `org:${orgId}:80`,
    );
  });
});
