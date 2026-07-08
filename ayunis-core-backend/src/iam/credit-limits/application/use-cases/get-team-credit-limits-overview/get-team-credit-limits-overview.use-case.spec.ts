import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ListTeamsUseCase } from 'src/iam/teams/application/use-cases/list-teams/list-teams.use-case';
import { GetMonthlyCreditUsageForTeamUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-team/get-monthly-credit-usage-for-team.use-case';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import {
  aTeamCreditLimit,
  createMockCreditLimitRepository,
  TEST_ORG_ID,
  TEST_TEAM_ID,
} from '../../testing/credit-limit.fixtures';
import { GetTeamCreditLimitsOverviewUseCase } from './get-team-credit-limits-overview.use-case';

describe('GetTeamCreditLimitsOverviewUseCase', () => {
  let useCase: GetTeamCreditLimitsOverviewUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let context: { get: jest.Mock };
  let listTeams: { execute: jest.Mock };
  let getUsage: { execute: jest.Mock };

  const orgId = TEST_ORG_ID;
  const teamId = TEST_TEAM_ID;

  const teamLimit = aTeamCreditLimit();

  beforeEach(async () => {
    repository = createMockCreditLimitRepository();
    repository.findTeamLimits.mockResolvedValue([teamLimit]);
    context = { get: jest.fn().mockReturnValue(orgId) };
    listTeams = {
      execute: jest
        .fn()
        .mockResolvedValue([
          { team: { id: teamId, name: 'Engineering' }, memberCount: 3 },
        ]),
    };
    getUsage = {
      execute: jest.fn().mockResolvedValue({ creditsUsed: 8300 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTeamCreditLimitsOverviewUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: ContextService, useValue: context },
        { provide: ListTeamsUseCase, useValue: listTeams },
        { provide: GetMonthlyCreditUsageForTeamUseCase, useValue: getUsage },
      ],
    }).compile();

    useCase = module.get(GetTeamCreditLimitsOverviewUseCase);
  });

  it('enriches each team limit with name and consumption', async () => {
    const result = await useCase.execute();

    expect(result).toEqual([
      {
        teamId,
        name: 'Engineering',
        monthlyCredits: 20000,
        creditsUsed: 8300,
      },
    ]);
    expect(repository.findTeamLimits).toHaveBeenCalledWith(orgId);
  });

  it('returns an empty list without enriching when no team limits exist', async () => {
    repository.findTeamLimits.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
    expect(listTeams.execute).not.toHaveBeenCalled();
    expect(getUsage.execute).not.toHaveBeenCalled();
  });

  it('falls back to empty name and zero usage when the team is missing, without querying usage', async () => {
    listTeams.execute.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([
      { teamId, name: '', monthlyCredits: 20000, creditsUsed: 0 },
    ]);
    expect(getUsage.execute).not.toHaveBeenCalled();
  });

  it('throws when there is no organization in context', async () => {
    context.get.mockReturnValue(undefined);

    await expect(useCase.execute()).rejects.toThrow(UnauthorizedAccessError);
  });
});
