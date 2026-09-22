import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ListTeamsUseCase } from 'src/iam/teams/application/use-cases/list-teams/list-teams.use-case';
import { GetMonthlyCreditUsageForTeamsUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-teams/get-monthly-credit-usage-for-teams.use-case';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import {
  aTeamCreditLimit,
  createMockCreditLimitRepository,
  TEST_ORG_ID,
  TEST_TEAM_ID,
} from 'src/iam/credit-limits/application/testing/credit-limit.fixtures';
import { GetTeamCreditLimitsOverviewUseCase } from './get-team-credit-limits-overview.use-case';
import { GetTeamCreditLimitsOverviewQuery } from './get-team-credit-limits-overview.query';

describe('GetTeamCreditLimitsOverviewUseCase', () => {
  let useCase: GetTeamCreditLimitsOverviewUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let context: { get: jest.Mock };
  let listTeams: { execute: jest.Mock };
  let getUsage: { execute: jest.Mock };

  const orgId = TEST_ORG_ID;
  const teamId = TEST_TEAM_ID;
  const secondTeamId = '44444444-4444-4444-4444-444444444444' as const;
  const since = new Date('2026-07-10T00:00:00.000Z');

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
      execute: jest.fn().mockResolvedValue(new Map([[teamId, 8300]])),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTeamCreditLimitsOverviewUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: ContextService, useValue: context },
        { provide: ListTeamsUseCase, useValue: listTeams },
        { provide: GetMonthlyCreditUsageForTeamsUseCase, useValue: getUsage },
      ],
    }).compile();

    useCase = module.get(GetTeamCreditLimitsOverviewUseCase);
  });

  it('enriches all team limits through one batched usage operation', async () => {
    repository.findTeamLimits.mockResolvedValue([
      teamLimit,
      aTeamCreditLimit({ teamId: secondTeamId, monthlyCredits: 10000 }),
    ]);
    listTeams.execute.mockResolvedValue([
      { team: { id: teamId, name: 'Engineering' }, memberCount: 3 },
      { team: { id: secondTeamId, name: 'Finance' }, memberCount: 2 },
    ]);
    getUsage.execute.mockResolvedValue(
      new Map([
        [teamId, 8300],
        [secondTeamId, 2400],
      ]),
    );

    const result = await useCase.execute();

    expect(result).toEqual([
      {
        teamId,
        name: 'Engineering',
        monthlyCredits: 20000,
        creditsUsed: 8300,
      },
      {
        teamId: secondTeamId,
        name: 'Finance',
        monthlyCredits: 10000,
        creditsUsed: 2400,
      },
    ]);
    expect(repository.findTeamLimits).toHaveBeenCalledWith(orgId);
    expect(getUsage.execute).toHaveBeenCalledTimes(1);
    expect(getUsage.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: orgId,
        teamIds: [teamId, secondTeamId],
      }),
    );
  });

  it('returns raw usage when consumption exceeds the configured limit', async () => {
    getUsage.execute.mockResolvedValue(new Map([[teamId, 23500]]));

    await expect(useCase.execute()).resolves.toEqual([
      {
        teamId,
        name: 'Engineering',
        monthlyCredits: 20000,
        creditsUsed: 23500,
      },
    ]);
  });

  it('forwards an explicit usage start to the consumption query', async () => {
    await useCase.execute(new GetTeamCreditLimitsOverviewQuery(since));

    expect(getUsage.execute).toHaveBeenCalledWith(
      expect.objectContaining({ since }),
    );
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
