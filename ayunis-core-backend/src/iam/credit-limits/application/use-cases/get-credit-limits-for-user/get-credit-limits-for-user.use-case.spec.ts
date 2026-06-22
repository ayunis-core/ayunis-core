import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { FindTeamsByUserIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-user-id/find-teams-by-user-id.use-case';
import { Team } from 'src/iam/teams/domain/team.entity';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { CreditLimit } from '../../../domain/credit-limit.entity';
import { CreditLimitScope } from '../../../domain/value-objects/credit-limit-scope.enum';
import { GetCreditLimitsForUserUseCase } from './get-credit-limits-for-user.use-case';
import { GetCreditLimitsForUserQuery } from './get-credit-limits-for-user.query';

describe('GetCreditLimitsForUserUseCase', () => {
  let useCase: GetCreditLimitsForUserUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let findTeams: { execute: jest.Mock };

  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const userId = '22222222-2222-2222-2222-222222222222' as UUID;
  const teamAId = '33333333-3333-3333-3333-333333333333' as UUID;
  const teamBId = '44444444-4444-4444-4444-444444444444' as UUID;

  const team = (id: UUID): Team =>
    new Team({ id, name: `team-${id}`, orgId, modelOverrideEnabled: false });

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findByOrg: jest.fn(),
      findByUserId: jest.fn().mockResolvedValue(null),
      findByTeamId: jest.fn(),
      findByTeamIds: jest.fn().mockResolvedValue([]),
      deleteByUserId: jest.fn(),
      deleteByTeamId: jest.fn(),
    };
    findTeams = { execute: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCreditLimitsForUserUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: FindTeamsByUserIdUseCase, useValue: findTeams },
      ],
    }).compile();

    useCase = module.get(GetCreditLimitsForUserUseCase);
  });

  it('returns null personalCreditLimit and no team limits when nothing is configured', async () => {
    const result = await useCase.execute(
      new GetCreditLimitsForUserQuery(orgId, userId),
    );

    expect(result).toEqual({ personalCreditLimit: null, teamCreditLimits: [] });
  });

  it('returns the personal limit and only the limited teams the user belongs to', async () => {
    repository.findByUserId.mockResolvedValue(
      new CreditLimit({
        orgId,
        target: { scope: CreditLimitScope.USER, userId },
        monthlyCredits: 5000,
      }),
    );
    findTeams.execute.mockResolvedValue([team(teamAId), team(teamBId)]);
    // Only team A has a configured limit.
    repository.findByTeamIds.mockResolvedValue([
      new CreditLimit({
        orgId,
        target: { scope: CreditLimitScope.TEAM, teamId: teamAId },
        monthlyCredits: 20000,
      }),
    ]);

    const result = await useCase.execute(
      new GetCreditLimitsForUserQuery(orgId, userId),
    );

    expect(result.personalCreditLimit).toBe(5000);
    expect(result.teamCreditLimits).toEqual([
      { teamId: teamAId, monthlyCredits: 20000 },
    ]);
    expect(repository.findByTeamIds).toHaveBeenCalledWith(orgId, [
      teamAId,
      teamBId,
    ]);
  });
});
