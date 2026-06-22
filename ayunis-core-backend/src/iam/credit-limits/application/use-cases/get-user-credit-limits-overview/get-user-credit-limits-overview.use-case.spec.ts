import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { GetMonthlyCreditUsageForUsersUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-users/get-monthly-credit-usage-for-users.use-case';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { CreditLimit } from '../../../domain/credit-limit.entity';
import { CreditLimitScope } from '../../../domain/value-objects/credit-limit-scope.enum';
import { GetUserCreditLimitsOverviewUseCase } from './get-user-credit-limits-overview.use-case';

describe('GetUserCreditLimitsOverviewUseCase', () => {
  let useCase: GetUserCreditLimitsOverviewUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let context: { get: jest.Mock };
  let findUsersByIds: { execute: jest.Mock };
  let getUsage: { execute: jest.Mock };

  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const userId = '22222222-2222-2222-2222-222222222222' as UUID;

  const userLimit = new CreditLimit({
    orgId,
    target: { scope: CreditLimitScope.USER, userId },
    monthlyCredits: 5000,
  });

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findUserLimits: jest.fn().mockResolvedValue([userLimit]),
      findTeamLimits: jest.fn(),
      findByUserId: jest.fn(),
      findByTeamId: jest.fn(),
      findByTeamIds: jest.fn(),
      deleteByUserId: jest.fn(),
      deleteByTeamId: jest.fn(),
    };
    context = { get: jest.fn().mockReturnValue(orgId) };
    findUsersByIds = {
      execute: jest
        .fn()
        .mockResolvedValue([
          { id: userId, name: 'Jane Doe', email: 'jane@example.com' },
        ]),
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
});
