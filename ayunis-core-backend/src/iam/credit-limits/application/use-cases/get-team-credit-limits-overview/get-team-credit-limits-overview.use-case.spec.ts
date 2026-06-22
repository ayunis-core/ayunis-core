import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ListTeamsUseCase } from 'src/iam/teams/application/use-cases/list-teams/list-teams.use-case';
import { GetMonthlyCreditUsageForTeamUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-team/get-monthly-credit-usage-for-team.use-case';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { CreditLimit } from '../../../domain/credit-limit.entity';
import { CreditLimitScope } from '../../../domain/value-objects/credit-limit-scope.enum';
import { GetTeamCreditLimitsOverviewUseCase } from './get-team-credit-limits-overview.use-case';

describe('GetTeamCreditLimitsOverviewUseCase', () => {
  let useCase: GetTeamCreditLimitsOverviewUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let context: { get: jest.Mock };
  let listTeams: { execute: jest.Mock };
  let getUsage: { execute: jest.Mock };

  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const teamId = '33333333-3333-3333-3333-333333333333' as UUID;

  const teamLimit = new CreditLimit({
    orgId,
    target: { scope: CreditLimitScope.TEAM, teamId },
    monthlyCredits: 20000,
  });

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findUserLimits: jest.fn(),
      findTeamLimits: jest.fn().mockResolvedValue([teamLimit]),
      findByUserId: jest.fn(),
      findByTeamId: jest.fn(),
      findByTeamIds: jest.fn(),
      deleteByUserId: jest.fn(),
      deleteByTeamId: jest.fn(),
    };
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
