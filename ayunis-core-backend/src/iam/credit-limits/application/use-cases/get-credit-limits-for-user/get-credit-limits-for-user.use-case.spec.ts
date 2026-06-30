import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { FindTeamsByUserIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-user-id/find-teams-by-user-id.use-case';
import { Team } from 'src/iam/teams/domain/team.entity';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import {
  aTeamCreditLimit,
  aUserCreditLimit,
  createMockCreditLimitRepository,
  TEST_ORG_ID,
  TEST_TEAM_ID,
  TEST_USER_ID,
} from '../../testing/credit-limit.fixtures';
import { GetCreditLimitsForUserUseCase } from './get-credit-limits-for-user.use-case';
import { GetCreditLimitsForUserQuery } from './get-credit-limits-for-user.query';

describe('GetCreditLimitsForUserUseCase', () => {
  let useCase: GetCreditLimitsForUserUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let findTeams: { execute: jest.Mock };

  const orgId = TEST_ORG_ID;
  const userId = TEST_USER_ID;
  const teamAId = TEST_TEAM_ID;
  const teamBId = '44444444-4444-4444-4444-444444444444' as UUID;

  const team = (id: UUID): Team =>
    new Team({ id, name: `team-${id}`, orgId, modelOverrideEnabled: false });

  beforeEach(async () => {
    repository = createMockCreditLimitRepository();
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
      aUserCreditLimit({ monthlyCredits: 5000 }),
    );
    findTeams.execute.mockResolvedValue([team(teamAId), team(teamBId)]);
    // Only team A has a configured limit.
    repository.findByTeamIds.mockResolvedValue([
      aTeamCreditLimit({ teamId: teamAId, monthlyCredits: 20000 }),
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
