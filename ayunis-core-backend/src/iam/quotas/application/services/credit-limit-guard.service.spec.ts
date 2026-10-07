import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ResolveCreditLimitsForUserUseCase } from 'src/iam/credit-limits/application/use-cases/resolve-credit-limits-for-user/resolve-credit-limits-for-user.use-case';
import {
  TeamCreditLimitExceededError,
  UserCreditLimitExceededError,
} from 'src/iam/credit-limits/application/credit-limits.errors';
import { GetMonthlyCreditUsageForUserUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-user/get-monthly-credit-usage-for-user.use-case';
import { GetMonthlyCreditUsageForTeamsUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-teams/get-monthly-credit-usage-for-teams.use-case';
import { GetMonthlyCreditUsageForUsersUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-users/get-monthly-credit-usage-for-users.use-case';
import { FindAllUserIdsByTeamIdsUseCase } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-ids/find-all-user-ids-by-team-ids.use-case';
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
    getTeamUsage = { execute: jest.fn().mockResolvedValue(new Map()) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditLimitGuardService,
        { provide: ResolveCreditLimitsForUserUseCase, useValue: getLimits },
        {
          provide: GetMonthlyCreditUsageForUserUseCase,
          useValue: getUserUsage,
        },
        {
          provide: GetMonthlyCreditUsageForTeamsUseCase,
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

  it('blocks on personal exhaustion before checking configured team pools', async () => {
    getLimits.execute.mockResolvedValue({
      personalCreditLimit: 1000,
      teamCreditLimits: [{ teamId, monthlyCredits: 5000 }],
    });
    getUserUsage.execute.mockResolvedValue({ creditsUsed: 1000 });

    await expect(service.ensureWithinLimits(orgId, userId)).rejects.toThrow(
      UserCreditLimitExceededError,
    );
    expect(getTeamUsage.execute).not.toHaveBeenCalled();
  });

  it('blocks when a team the user belongs to is exhausted, even if the user is under their own limit', async () => {
    getLimits.execute.mockResolvedValue({
      personalCreditLimit: 1000,
      teamCreditLimits: [{ teamId, monthlyCredits: 5000 }],
    });
    getUserUsage.execute.mockResolvedValue({ creditsUsed: 10 });
    getTeamUsage.execute.mockResolvedValue(new Map([[teamId, 5000]]));

    await expect(service.ensureWithinLimits(orgId, userId)).rejects.toThrow(
      TeamCreditLimitExceededError,
    );
  });

  it("blocks a current member when another member's usage exhausts their shared team pool", async () => {
    const otherMemberId = 'user-2' as UUID;
    getLimits.execute.mockResolvedValue({
      personalCreditLimit: null,
      teamCreditLimits: [{ teamId, monthlyCredits: 5000 }],
    });
    const findMembers = {
      execute: jest
        .fn()
        .mockResolvedValue(new Map([[teamId, [userId, otherMemberId]]])),
    };
    const getUsageByUser = {
      execute: jest.fn().mockResolvedValue(
        new Map<UUID, number>([
          [userId, 10],
          [otherMemberId, 4990],
        ]),
      ),
    };
    const module = await Test.createTestingModule({
      providers: [
        CreditLimitGuardService,
        GetMonthlyCreditUsageForTeamsUseCase,
        { provide: ResolveCreditLimitsForUserUseCase, useValue: getLimits },
        {
          provide: GetMonthlyCreditUsageForUserUseCase,
          useValue: getUserUsage,
        },
        { provide: FindAllUserIdsByTeamIdsUseCase, useValue: findMembers },
        {
          provide: GetMonthlyCreditUsageForUsersUseCase,
          useValue: getUsageByUser,
        },
      ],
    }).compile();
    const guard = module.get(CreditLimitGuardService);

    await expect(guard.ensureWithinLimits(orgId, userId)).rejects.toThrow(
      TeamCreditLimitExceededError,
    );
    expect(getUsageByUser.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: [userId, otherMemberId] }),
    );
  });

  it('checks all team pools through one batched usage operation', async () => {
    const secondTeamId = 'team-2' as UUID;
    getLimits.execute.mockResolvedValue({
      personalCreditLimit: null,
      teamCreditLimits: [
        { teamId, monthlyCredits: 5000 },
        { teamId: secondTeamId, monthlyCredits: 2000 },
      ],
    });
    getTeamUsage.execute.mockResolvedValue(
      new Map<UUID, number>([
        [teamId, 4999],
        [secondTeamId, 2000],
      ]),
    );

    await expect(service.ensureWithinLimits(orgId, userId)).rejects.toThrow(
      TeamCreditLimitExceededError,
    );
    expect(getTeamUsage.execute).toHaveBeenCalledTimes(1);
    expect(getTeamUsage.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: orgId,
        teamIds: [teamId, secondTeamId],
      }),
    );
  });

  it('allows concurrent checks that both observe persisted usage below the team limit', async () => {
    getLimits.execute.mockResolvedValue({
      personalCreditLimit: null,
      teamCreditLimits: [{ teamId, monthlyCredits: 5000 }],
    });
    let releaseBothChecks!: () => void;
    const bothChecksStarted = new Promise<void>((resolve) => {
      releaseBothChecks = resolve;
    });
    getTeamUsage.execute.mockImplementation(async () => {
      if (getTeamUsage.execute.mock.calls.length === 2) {
        releaseBothChecks();
      }
      await bothChecksStarted;
      return new Map([[teamId, 4999]]);
    });

    await expect(
      Promise.all([
        service.ensureWithinLimits(orgId, userId),
        service.ensureWithinLimits(orgId, userId),
      ]),
    ).resolves.toEqual([undefined, undefined]);
    expect(getTeamUsage.execute).toHaveBeenCalledTimes(2);
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
