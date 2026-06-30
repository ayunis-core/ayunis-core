import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { ListTeamsUseCase } from 'src/iam/teams/application/use-cases/list-teams/list-teams.use-case';
import { GetMonthlyCreditUsageForUsersUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-users/get-monthly-credit-usage-for-users.use-case';
import { GetMonthlyCreditUsageForTeamUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-team/get-monthly-credit-usage-for-team.use-case';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import {
  aTeamCreditLimit,
  aUserCreditLimit,
  createMockCreditLimitRepository,
  TEST_ORG_ID,
  TEST_TEAM_ID,
  TEST_USER_ID,
} from '../../testing/credit-limit.fixtures';
import { GetCreditLimitsOverviewUseCase } from './get-credit-limits-overview.use-case';

describe('GetCreditLimitsOverviewUseCase', () => {
  let useCase: GetCreditLimitsOverviewUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let findUsersByIds: { execute: jest.Mock };
  let listTeams: { execute: jest.Mock };
  let getUsersUsage: { execute: jest.Mock };
  let getTeamUsage: { execute: jest.Mock };

  const orgId = TEST_ORG_ID;
  const userId = TEST_USER_ID;
  const teamId = TEST_TEAM_ID;

  beforeEach(async () => {
    repository = createMockCreditLimitRepository();
    findUsersByIds = { execute: jest.fn().mockResolvedValue([]) };
    listTeams = { execute: jest.fn().mockResolvedValue([]) };
    getUsersUsage = { execute: jest.fn().mockResolvedValue(new Map()) };
    getTeamUsage = { execute: jest.fn().mockResolvedValue({ creditsUsed: 0 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCreditLimitsOverviewUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: ContextService, useValue: { get: () => orgId } },
        { provide: FindUsersByIdsUseCase, useValue: findUsersByIds },
        { provide: ListTeamsUseCase, useValue: listTeams },
        {
          provide: GetMonthlyCreditUsageForUsersUseCase,
          useValue: getUsersUsage,
        },
        {
          provide: GetMonthlyCreditUsageForTeamUseCase,
          useValue: getTeamUsage,
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
      aUserCreditLimit({ monthlyCredits: 5000 }),
      aTeamCreditLimit({ monthlyCredits: 20000 }),
    ]);
    findUsersByIds.execute.mockResolvedValue([
      { id: userId, name: 'Jane Doe', email: 'jane.doe@example.com' },
    ]);
    listTeams.execute.mockResolvedValue([
      { team: { id: teamId, name: 'Engineering' }, memberCount: 3 },
    ]);
    getUsersUsage.execute.mockResolvedValue(new Map([[userId, 1240]]));
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

  it('keeps the row but hides usage when the target user is outside the org', async () => {
    repository.findByOrg.mockResolvedValue([
      aUserCreditLimit({ monthlyCredits: 5000 }),
    ]);
    findUsersByIds.execute.mockResolvedValue([]); // not a member of this org
    getUsersUsage.execute.mockResolvedValue(new Map([[userId, 10]]));

    const result = await useCase.execute();

    // Row stays visible (admin can remove a stale limit) but the foreign
    // user's usage must not leak — creditsUsed is zeroed, not 10.
    expect(result.users[0]).toEqual({
      userId,
      name: '',
      email: '',
      monthlyCredits: 5000,
      creditsUsed: 0,
    });
  });
});
