import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { FindAllUserIdsByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.use-case';
import { GetMonthlyCreditUsageForUsersUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-users/get-monthly-credit-usage-for-users.use-case';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import {
  aDefaultUserCreditLimit,
  aUserCreditLimit,
  createMockCreditLimitRepository,
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/iam/credit-limits/application/testing/credit-limit.fixtures';
import { GetUserCreditLimitsOverviewUseCase } from './get-user-credit-limits-overview.use-case';
import { GetUserCreditLimitsOverviewQuery } from './get-user-credit-limits-overview.query';

describe('GetUserCreditLimitsOverviewUseCase', () => {
  let useCase: GetUserCreditLimitsOverviewUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let context: { get: jest.Mock };
  let findUsersByIds: { execute: jest.Mock };
  let getUsage: { execute: jest.Mock };
  let findAllUserIds: { execute: jest.Mock };

  const orgId = TEST_ORG_ID;
  const userId = TEST_USER_ID;
  const defaultUserId = '55555555-5555-5555-5555-555555555555' as UUID;
  const since = new Date('2026-07-10T00:00:00.000Z');

  const userLimit = aUserCreditLimit();

  beforeEach(async () => {
    repository = createMockCreditLimitRepository();
    repository.findUserLimits.mockResolvedValue([userLimit]);
    context = { get: jest.fn().mockReturnValue(orgId) };
    findUsersByIds = {
      execute: jest
        .fn()
        .mockResolvedValue([
          { id: userId, name: 'Jane Doe', email: 'jane@example.com' },
        ]),
    };
    findAllUserIds = {
      execute: jest.fn().mockResolvedValue([userId, defaultUserId]),
    };
    getUsage = {
      execute: jest
        .fn()
        .mockResolvedValue(new Map<UUID, number>([[userId, 1240]])),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserCreditLimitsOverviewUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: ContextService, useValue: context },
        { provide: FindUsersByIdsUseCase, useValue: findUsersByIds },
        { provide: GetMonthlyCreditUsageForUsersUseCase, useValue: getUsage },
        { provide: FindAllUserIdsByOrgIdUseCase, useValue: findAllUserIds },
      ],
    }).compile();

    useCase = module.get(GetUserCreditLimitsOverviewUseCase);
  });

  it('enriches each user limit with name, email and consumption', async () => {
    const result = await useCase.execute();

    expect(result).toEqual([
      {
        userId,
        name: 'Jane Doe',
        email: 'jane@example.com',
        monthlyCredits: 5000,
        creditsUsed: 1240,
      },
    ]);
    expect(repository.findUserLimits).toHaveBeenCalledWith(orgId);
  });

  it('forwards an explicit usage start to the consumption query', async () => {
    await useCase.execute(new GetUserCreditLimitsOverviewQuery(since));

    expect(getUsage.execute).toHaveBeenCalledWith(
      expect.objectContaining({ since }),
    );
  });

  it('returns an empty list without enriching when no user limits exist', async () => {
    repository.findUserLimits.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
    expect(findUsersByIds.execute).not.toHaveBeenCalled();
    expect(getUsage.execute).not.toHaveBeenCalled();
  });

  it('falls back to empty name/email and zero usage when the user is missing', async () => {
    findUsersByIds.execute.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([
      { userId, name: '', email: '', monthlyCredits: 5000, creditsUsed: 0 },
    ]);
  });

  it('throws when there is no organization in context', async () => {
    context.get.mockReturnValue(undefined);

    await expect(useCase.execute()).rejects.toThrow(UnauthorizedAccessError);
  });

  describe('with users on the organization default limit', () => {
    beforeEach(() => {
      repository.findDefaultUserLimit.mockResolvedValue(
        aDefaultUserCreditLimit({ monthlyCredits: 1_000_000 }),
      );
      findUsersByIds.execute.mockResolvedValue([
        { id: userId, name: 'Jane Doe', email: 'jane@example.com' },
        { id: defaultUserId, name: 'Max Muster', email: 'max@example.com' },
      ]);
      getUsage.execute.mockResolvedValue(
        new Map<UUID, number>([
          [userId, 1240],
          [defaultUserId, 850_000],
        ]),
      );
    });

    it('lists them with the default allowance when requested', async () => {
      const result = await useCase.execute(
        new GetUserCreditLimitsOverviewQuery(since, true),
      );

      expect(result).toEqual([
        {
          userId,
          name: 'Jane Doe',
          email: 'jane@example.com',
          monthlyCredits: 5000,
          creditsUsed: 1240,
        },
        {
          userId: defaultUserId,
          name: 'Max Muster',
          email: 'max@example.com',
          monthlyCredits: 1_000_000,
          creditsUsed: 850_000,
        },
      ]);
      expect(getUsage.execute).toHaveBeenCalledWith(
        expect.objectContaining({ userIds: [userId, defaultUserId], since }),
      );
    });

    it('lists only individual limits unless requested', async () => {
      const result = await useCase.execute();

      expect(result.map((item) => item.userId)).toEqual([userId]);
      expect(findAllUserIds.execute).not.toHaveBeenCalled();
    });

    it('applies the default to every user when nobody has an individual limit', async () => {
      repository.findUserLimits.mockResolvedValue([]);

      const result = await useCase.execute(
        new GetUserCreditLimitsOverviewQuery(undefined, true),
      );

      expect(result.map((item) => [item.userId, item.monthlyCredits])).toEqual([
        [userId, 1_000_000],
        [defaultUserId, 1_000_000],
      ]);
    });
  });

  it('adds nobody when requested but no default limit is set', async () => {
    const result = await useCase.execute(
      new GetUserCreditLimitsOverviewQuery(undefined, true),
    );

    expect(result.map((item) => item.userId)).toEqual([userId]);
    expect(findAllUserIds.execute).not.toHaveBeenCalled();
  });
});
