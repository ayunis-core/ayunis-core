import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { GetOrgAdminsUseCase } from 'src/iam/users/application/use-cases/get-org-admins/get-org-admins.use-case';
import { OrgBudgetAlertNotification } from '../../../domain/budget-alert-notification.entity';
import { BudgetAlertNotificationRepository } from '../../ports/budget-alert-notification.repository';
import { BudgetAlertScope } from '../../../domain/value-objects/budget-alert-scope.enum';
import {
  notificationKey,
  type BudgetTarget,
} from '../../utils/budget-alert-crossing';
import { SendBudgetWarningEmailUseCase } from '../send-budget-warning-email/send-budget-warning-email.use-case';
import { UnexpectedCreditAlertError } from '../../credit-alerts.errors';
import { ProcessBudgetAlertCrossingsQuery } from './process-budget-alert-crossings.query';
import { ProcessBudgetAlertCrossingsUseCase } from './process-budget-alert-crossings.use-case';

describe('ProcessBudgetAlertCrossingsUseCase', () => {
  let useCase: ProcessBudgetAlertCrossingsUseCase;
  let admins: { execute: jest.Mock };
  let sendEmail: { execute: jest.Mock };
  let repository: jest.Mocked<BudgetAlertNotificationRepository>;

  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const periodStart = new Date('2026-07-01T00:00:00.000Z');
  const orgTarget: BudgetTarget = {
    scope: BudgetAlertScope.ORG,
    targetId: orgId,
    name: '',
    monthlyCredits: 1000,
    creditsUsed: 830,
  };

  beforeEach(async () => {
    admins = {
      execute: jest
        .fn()
        .mockResolvedValue([
          { name: 'Andrea Admin', email: 'andrea@example.de' },
        ]),
    };
    sendEmail = { execute: jest.fn().mockResolvedValue(undefined) };
    repository = {
      findByOrgAndPeriod: jest.fn().mockResolvedValue([]),
      recordMany: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessBudgetAlertCrossingsUseCase,
        { provide: GetOrgAdminsUseCase, useValue: admins },
        { provide: SendBudgetWarningEmailUseCase, useValue: sendEmail },
        { provide: BudgetAlertNotificationRepository, useValue: repository },
      ],
    }).compile();

    useCase = module.get(ProcessBudgetAlertCrossingsUseCase);
  });

  const run = (targets: BudgetTarget[] = [orgTarget]) =>
    useCase.execute(
      new ProcessBudgetAlertCrossingsQuery(orgId, periodStart, targets),
    );

  it('sends the highest crossing and records all newly crossed thresholds atomically', async () => {
    await run();

    expect(sendEmail.execute).toHaveBeenCalledTimes(1);
    expect(sendEmail.execute.mock.calls[0][0].threshold).toBe(80);
    expect(repository.recordMany).toHaveBeenCalledTimes(1);
    expect(repository.recordMany.mock.calls[0][0]).toEqual([
      expect.objectContaining({ threshold: 50 }),
      expect.objectContaining({ threshold: 80 }),
    ]);
  });

  it('does not record a crossing when there are no admins', async () => {
    admins.execute.mockResolvedValue([]);

    await run();

    expect(sendEmail.execute).not.toHaveBeenCalled();
    expect(repository.recordMany).not.toHaveBeenCalled();
  });

  it('records a crossing when at least one admin receives the email', async () => {
    admins.execute.mockResolvedValue([
      { name: 'Andrea', email: 'andrea@example.de' },
      { name: 'Boris', email: 'boris@example.de' },
    ]);
    sendEmail.execute
      .mockRejectedValueOnce(new Error('smtp down'))
      .mockResolvedValueOnce(undefined);

    await run();

    expect(sendEmail.execute).toHaveBeenCalledTimes(2);
    expect(repository.recordMany).toHaveBeenCalled();
  });

  it('leaves a crossing unrecorded when every admin send fails', async () => {
    sendEmail.execute.mockRejectedValue(new Error('smtp down'));

    await run();

    expect(repository.recordMany).not.toHaveBeenCalled();
  });

  it('does not send a threshold that was already recorded', async () => {
    repository.findByOrgAndPeriod.mockResolvedValue([
      new OrgBudgetAlertNotification({
        orgId,
        threshold: 50,
        periodStart,
      }),
      new OrgBudgetAlertNotification({
        orgId,
        threshold: 80,
        periodStart,
      }),
    ]);

    await run();

    expect(sendEmail.execute).not.toHaveBeenCalled();
    expect(repository.recordMany).not.toHaveBeenCalled();
  });

  it('continues with remaining crossings when recording one fails', async () => {
    repository.recordMany.mockRejectedValueOnce(new Error('db down'));
    const userTarget: BudgetTarget = {
      scope: BudgetAlertScope.USER,
      targetId: '22222222-2222-2222-2222-222222222222',
      name: 'Jane',
      monthlyCredits: 100,
      creditsUsed: 90,
    };

    await run([orgTarget, userTarget]);

    expect(sendEmail.execute).toHaveBeenCalledTimes(2);
    expect(repository.recordMany).toHaveBeenCalledTimes(2);
  });

  it('wraps unexpected failures in UnexpectedCreditAlertError', async () => {
    repository.findByOrgAndPeriod.mockRejectedValue(new Error('db down'));

    await expect(run()).rejects.toBeInstanceOf(UnexpectedCreditAlertError);
  });

  it('uses scope, target, and threshold when loading recorded notifications', async () => {
    await run();

    expect(repository.findByOrgAndPeriod).toHaveBeenCalledWith(
      orgId,
      periodStart,
    );
    expect(notificationKey(BudgetAlertScope.ORG, orgId, 80)).toBe(
      `org:${orgId}:80`,
    );
  });
});
