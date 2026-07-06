import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { FindAllUserIdsByTeamIdUseCase } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-id/find-all-user-ids-by-team-id.use-case';
import { UsageRepository } from '../../ports/usage.repository';
import { GetMonthlyCreditUsageForTeamUseCase } from './get-monthly-credit-usage-for-team.use-case';
import { GetMonthlyCreditUsageForTeamQuery } from './get-monthly-credit-usage-for-team.query';

describe('GetMonthlyCreditUsageForTeamUseCase', () => {
  let useCase: GetMonthlyCreditUsageForTeamUseCase;
  let repository: { getTotalMonthlyCreditUsageForUsers: jest.Mock };
  let findMembers: { execute: jest.Mock };

  const orgId = '99999999-9999-9999-9999-999999999999' as UUID;
  const teamId = '33333333-3333-3333-3333-333333333333' as UUID;
  const memberA = '11111111-1111-1111-1111-111111111111' as UUID;
  const memberB = '22222222-2222-2222-2222-222222222222' as UUID;

  beforeEach(async () => {
    repository = { getTotalMonthlyCreditUsageForUsers: jest.fn() };
    findMembers = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMonthlyCreditUsageForTeamUseCase,
        { provide: UsageRepository, useValue: repository },
        { provide: FindAllUserIdsByTeamIdUseCase, useValue: findMembers },
      ],
    }).compile();

    useCase = module.get(GetMonthlyCreditUsageForTeamUseCase);
  });

  it('sums the consumption of every current team member', async () => {
    findMembers.execute.mockResolvedValue([memberA, memberB]);
    repository.getTotalMonthlyCreditUsageForUsers.mockResolvedValue(750);

    const result = await useCase.execute(
      new GetMonthlyCreditUsageForTeamQuery(orgId, teamId),
    );

    expect(result.creditsUsed).toBe(750);
    expect(repository.getTotalMonthlyCreditUsageForUsers).toHaveBeenCalledWith(
      orgId,
      [memberA, memberB],
      expect.any(Date),
    );
  });

  it('reports zero consumption for an empty team', async () => {
    findMembers.execute.mockResolvedValue([]);
    repository.getTotalMonthlyCreditUsageForUsers.mockResolvedValue(0);

    const result = await useCase.execute(
      new GetMonthlyCreditUsageForTeamQuery(orgId, teamId),
    );

    expect(result.creditsUsed).toBe(0);
  });
});
