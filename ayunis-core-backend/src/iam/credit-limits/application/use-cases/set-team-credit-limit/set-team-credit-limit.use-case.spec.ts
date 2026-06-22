import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { CreditLimit } from '../../../domain/credit-limit.entity';
import { CreditLimitScope } from '../../../domain/value-objects/credit-limit-scope.enum';
import { InvalidCreditLimitError } from '../../credit-limits.errors';
import { SetTeamCreditLimitUseCase } from './set-team-credit-limit.use-case';
import { SetTeamCreditLimitCommand } from './set-team-credit-limit.command';

describe('SetTeamCreditLimitUseCase', () => {
  let useCase: SetTeamCreditLimitUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let context: { get: jest.Mock };

  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const targetTeamId = '33333333-3333-3333-3333-333333333333' as UUID;

  beforeEach(async () => {
    repository = {
      save: jest.fn((limit: CreditLimit) => Promise.resolve(limit)),
      findByOrg: jest.fn(),
      findByUserId: jest.fn(),
      findByTeamId: jest.fn().mockResolvedValue(null),
      findByTeamIds: jest.fn(),
      deleteByUserId: jest.fn(),
      deleteByTeamId: jest.fn(),
    };
    context = { get: jest.fn().mockReturnValue(orgId) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetTeamCreditLimitUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: ContextService, useValue: context },
      ],
    }).compile();

    useCase = module.get(SetTeamCreditLimitUseCase);
  });

  it('creates a new TEAM-scoped limit when none exists', async () => {
    const result = await useCase.execute(
      new SetTeamCreditLimitCommand(targetTeamId, 20000),
    );

    expect(result.scope).toBe(CreditLimitScope.TEAM);
    expect(result.targetTeamId).toBe(targetTeamId);
    expect(result.targetUserId).toBeNull();
    expect(result.monthlyCredits).toBe(20000);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('updates an existing team limit in place, preserving its identity', async () => {
    const existing = CreditLimit.forTeam(orgId, targetTeamId, 5000);
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
});
