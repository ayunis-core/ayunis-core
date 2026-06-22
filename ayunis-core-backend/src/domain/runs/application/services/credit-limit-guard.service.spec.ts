import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { GetCreditLimitsForUserUseCase } from 'src/iam/credit-limits/application/use-cases/get-credit-limits-for-user/get-credit-limits-for-user.use-case';
import {
  TeamCreditLimitExceededError,
  UserCreditLimitExceededError,
} from 'src/iam/credit-limits/application/credit-limits.errors';
import { GetMonthlyCreditUsageForUserUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-user/get-monthly-credit-usage-for-user.use-case';
import { GetMonthlyCreditUsageForTeamUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-team/get-monthly-credit-usage-for-team.use-case';
import { CreditLimitGuardService } from './credit-limit-guard.service';

describe('CreditLimitGuardService', () => {
  let service: CreditLimitGuardService;
  let getLimits: { execute: jest.Mock };
  let getUserUsage: { execute: jest.Mock };
  let getTeamUsage: { execute: jest.Mock };

  const orgId = 'org-1' as UUID;
  const userId = 'user-1' as UUID;
  const teamId = 'team-1' as UUID;

  beforeEach(async () => {
    getLimits = {
      execute: jest
        .fn()
        .mockResolvedValue({ personalCreditLimit: null, teamCreditLimits: [] }),
    };
    getUserUsage = { execute: jest.fn().mockResolvedValue({ creditsUsed: 0 }) };
    getTeamUsage = { execute: jest.fn().mockResolvedValue({ creditsUsed: 0 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditLimitGuardService,
        { provide: GetCreditLimitsForUserUseCase, useValue: getLimits },
        {
          provide: GetMonthlyCreditUsageForUserUseCase,
          useValue: getUserUsage,
        },
        {
          provide: GetMonthlyCreditUsageForTeamUseCase,
          useValue: getTeamUsage,
        },
      ],
    }).compile();

    service = module.get(CreditLimitGuardService);
  });

  it('short-circuits without measuring usage when no limits are configured', async () => {
    await expect(
      service.ensureWithinLimits(orgId, userId),
    ).resolves.toBeUndefined();
    expect(getUserUsage.execute).not.toHaveBeenCalled();
    expect(getTeamUsage.execute).not.toHaveBeenCalled();
  });

  it('passes when the user is below their personal limit', async () => {
    getLimits.execute.mockResolvedValue({
      personalCreditLimit: 1000,
      teamCreditLimits: [],
    });
    getUserUsage.execute.mockResolvedValue({ creditsUsed: 999 });

    await expect(
      service.ensureWithinLimits(orgId, userId),
    ).resolves.toBeUndefined();
  });

  it('blocks when the personal limit is exactly reached', async () => {
    getLimits.execute.mockResolvedValue({
      personalCreditLimit: 1000,
      teamCreditLimits: [],
    });
    getUserUsage.execute.mockResolvedValue({ creditsUsed: 1000 });

    await expect(service.ensureWithinLimits(orgId, userId)).rejects.toThrow(
      UserCreditLimitExceededError,
    );
  });

  it('blocks when a team the user belongs to is exhausted, even if the user is under their own limit', async () => {
    getLimits.execute.mockResolvedValue({
      personalCreditLimit: 1000,
      teamCreditLimits: [{ teamId, monthlyCredits: 5000 }],
    });
    getUserUsage.execute.mockResolvedValue({ creditsUsed: 10 });
    getTeamUsage.execute.mockResolvedValue({ creditsUsed: 5000 });

    await expect(service.ensureWithinLimits(orgId, userId)).rejects.toThrow(
      TeamCreditLimitExceededError,
    );
  });

  it('blocks with a zero allowance (frozen user)', async () => {
    getLimits.execute.mockResolvedValue({
      personalCreditLimit: 0,
      teamCreditLimits: [],
    });
    getUserUsage.execute.mockResolvedValue({ creditsUsed: 0 });

    await expect(service.ensureWithinLimits(orgId, userId)).rejects.toThrow(
      UserCreditLimitExceededError,
    );
  });
});
