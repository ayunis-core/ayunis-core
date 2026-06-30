import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { TeamNotFoundError } from 'src/iam/teams/application/teams.errors';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { CreditLimitScope } from '../../../domain/value-objects/credit-limit-scope.enum';
import { InvalidCreditLimitError } from '../../credit-limits.errors';
import {
  aTeamCreditLimit,
  createMockCreditLimitRepository,
  TEST_ORG_ID,
  TEST_TEAM_ID,
} from '../../testing/credit-limit.fixtures';
import { SetTeamCreditLimitUseCase } from './set-team-credit-limit.use-case';
import { SetTeamCreditLimitCommand } from './set-team-credit-limit.command';

describe('SetTeamCreditLimitUseCase', () => {
  let useCase: SetTeamCreditLimitUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let context: { get: jest.Mock };
  let getTeam: { execute: jest.Mock };

  const orgId = TEST_ORG_ID;
  const targetTeamId = TEST_TEAM_ID;

  beforeEach(async () => {
    repository = createMockCreditLimitRepository();
    context = { get: jest.fn().mockReturnValue(orgId) };
    // Default: target team belongs to the caller's org (GetTeam resolves).
    getTeam = { execute: jest.fn().mockResolvedValue({ id: targetTeamId }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetTeamCreditLimitUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: ContextService, useValue: context },
        { provide: GetTeamUseCase, useValue: getTeam },
      ],
    }).compile();

    useCase = module.get(SetTeamCreditLimitUseCase);
  });

  it('creates a new TEAM-scoped limit when none exists', async () => {
    const result = await useCase.execute(
      new SetTeamCreditLimitCommand(targetTeamId, 20000),
    );

    expect(result.target).toEqual({
      scope: CreditLimitScope.TEAM,
      teamId: targetTeamId,
    });
    expect(result.monthlyCredits).toBe(20000);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('updates an existing team limit in place, preserving its identity', async () => {
    const existing = aTeamCreditLimit({ monthlyCredits: 5000 });
    repository.findByTeamId.mockResolvedValue(existing);

    const result = await useCase.execute(
      new SetTeamCreditLimitCommand(targetTeamId, 12000),
    );

    expect(result.id).toBe(existing.id);
    expect(result.monthlyCredits).toBe(12000);
    expect(result.createdAt).toBe(existing.createdAt);
  });

  it('allows a zero allowance (freezes the team)', async () => {
    const result = await useCase.execute(
      new SetTeamCreditLimitCommand(targetTeamId, 0),
    );

    expect(result.monthlyCredits).toBe(0);
  });

  it('rejects a negative monthly credit value', async () => {
    await expect(
      useCase.execute(new SetTeamCreditLimitCommand(targetTeamId, -100)),
    ).rejects.toThrow(InvalidCreditLimitError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects when there is no organization in context', async () => {
    context.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(new SetTeamCreditLimitCommand(targetTeamId, 100)),
    ).rejects.toThrow(UnauthorizedAccessError);
  });

  it('rejects a target team outside the caller org and persists nothing', async () => {
    getTeam.execute.mockRejectedValue(new TeamNotFoundError(targetTeamId));

    await expect(
      useCase.execute(new SetTeamCreditLimitCommand(targetTeamId, 20000)),
    ).rejects.toBeInstanceOf(TeamNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
