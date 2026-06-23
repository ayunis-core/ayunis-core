import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { ListTeamsUseCase } from 'src/iam/teams/application/use-cases/list-teams/list-teams.use-case';
import { GetMonthlyCreditUsageForUserUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-user/get-monthly-credit-usage-for-user.use-case';
import { GetMonthlyCreditUsageForTeamUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-team/get-monthly-credit-usage-for-team.use-case';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { CreditLimit } from '../../../domain/credit-limit.entity';
import { GetCreditLimitsOverviewUseCase } from './get-credit-limits-overview.use-case';
import { GetMonthlyCreditLimitUseCase } from 'src/iam/subscriptions/application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.use-case';

describe('GetCreditLimitsOverviewUseCase', () => {
  let useCase: GetCreditLimitsOverviewUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let findUsersByIds: { execute: jest.Mock };
  let listTeams: { execute: jest.Mock };
  let getUserUsage: { execute: jest.Mock };
  let getTeamUsage: { execute: jest.Mock };
  let getMonthlyCreditLimit: { execute: jest.Mock };

  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const userId = '22222222-2222-2222-2222-222222222222' as UUID;
  const teamId = '33333333-3333-3333-3333-333333333333' as UUID;

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findByOrg: jest.fn().mockResolvedValue([]),
      findByUserId: jest.fn(),
      findByTeamId: jest.fn(),
      findByTeamIds: jest.fn(),
      deleteByUserId: jest.fn(),
      deleteByTeamId: jest.fn(),
    };
    findUsersByIds = { execute: jest.fn().mockResolvedValue([]) };
    listTeams = { execute: jest.fn().mockResolvedValue([]) };
    getUserUsage = { execute: jest.fn().mockResolvedValue({ creditsUsed: 0 }) };
    getTeamUsage = { execute: jest.fn().mockResolvedValue({ creditsUsed: 0 }) };
    getMonthlyCreditLimit = {
      execute: jest.fn().mockResolvedValue({
        monthlyCredits: null,
        startsAt: null,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCreditLimitsOverviewUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: ContextService, useValue: { get: () => orgId } },
        { provide: FindUsersByIdsUseCase, useValue: findUsersByIds },
        { provide: ListTeamsUseCase, useValue: listTeams },
        {
          provide: GetMonthlyCreditUsageForUserUseCase,
          useValue: getUserUsage,
        },
        {
          provide: GetMonthlyCreditUsageForTeamUseCase,
          useValue: getTeamUsage,
        },
        {
          provide: GetMonthlyCreditLimitUseCase,
          useValue: getMonthlyCreditLimit,
        },
      ],
    }).compile();

    useCase = module.get(GetCreditLimitsOverviewUseCase);
  });

  it('returns empty groups and skips enrichment when nothing is configured', async () => {
    const result = await useCase.execute();

    expect(result).toEqual({ users: [], teams: [] });
    expect(findUsersByIds.execute).not.toHaveBeenCalled();
    expect(listTeams.execute).not.toHaveBeenCalled();
  });

  it('enriches each configured limit with its target name and current consumption', async () => {
    repository.findByOrg.mockResolvedValue([
      CreditLimit.forUser(orgId, userId, 5000),
      CreditLimit.forTeam(orgId, teamId, 20000),
    ]);
    findUsersByIds.execute.mockResolvedValue([
      { id: userId, name: 'Jane Doe', email: 'jane.doe@example.com' },
    ]);
    listTeams.execute.mockResolvedValue([
      { team: { id: teamId, name: 'Engineering' }, memberCount: 3 },
    ]);
    getUserUsage.execute.mockResolvedValue({ creditsUsed: 1240 });
    getTeamUsage.execute.mockResolvedValue({ creditsUsed: 8300 });

    const result = await useCase.execute();

    expect(result.users).toEqual([
      {
        userId,
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        monthlyCredits: 5000,
        creditsUsed: 1240,
      },
    ]);
    expect(result.teams).toEqual([
      {
        teamId,
        name: 'Engineering',
        monthlyCredits: 20000,
        creditsUsed: 8300,
      },
    ]);
  });

  it('falls back to empty name when the target user can no longer be resolved', async () => {
    repository.findByOrg.mockResolvedValue([
      CreditLimit.forUser(orgId, userId, 5000),
    ]);
    findUsersByIds.execute.mockResolvedValue([]); // user not found
    getUserUsage.execute.mockResolvedValue({ creditsUsed: 10 });

    const result = await useCase.execute();

    expect(result.users[0]).toMatchObject({ userId, name: '', email: '' });
  });
});
