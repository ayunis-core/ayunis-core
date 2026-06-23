import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { CreditLimit } from '../../../domain/credit-limit.entity';
import { CreditLimitScope } from '../../../domain/value-objects/credit-limit-scope.enum';
import { InvalidCreditLimitError } from '../../credit-limits.errors';
import { SetUserCreditLimitUseCase } from './set-user-credit-limit.use-case';
import { SetUserCreditLimitCommand } from './set-user-credit-limit.command';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';

describe('SetUserCreditLimitUseCase', () => {
  let useCase: SetUserCreditLimitUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let context: { get: jest.Mock };

  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const targetUserId = '22222222-2222-2222-2222-222222222222' as UUID;

  beforeEach(async () => {
    repository = {
      save: jest.fn((limit: CreditLimit) => Promise.resolve(limit)),
      findByOrg: jest.fn(),
      findByUserId: jest.fn().mockResolvedValue(null),
      findByTeamId: jest.fn(),
      findByTeamIds: jest.fn(),
      deleteByUserId: jest.fn(),
      deleteByTeamId: jest.fn(),
    };
    context = { get: jest.fn().mockReturnValue(orgId) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetUserCreditLimitUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: ContextService, useValue: context },
        {
          provide: FindUserByIdUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue({ id: targetUserId, orgId }),
          },
        },
      ],
    }).compile();

    useCase = module.get(SetUserCreditLimitUseCase);
  });

  it('creates a new USER-scoped limit when none exists', async () => {
    const result = await useCase.execute(
      new SetUserCreditLimitCommand(targetUserId, 5000),
    );

    expect(result.scope).toBe(CreditLimitScope.USER);
    expect(result.targetUserId).toBe(targetUserId);
    expect(result.monthlyCredits).toBe(5000);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('updates an existing limit in place, preserving its identity', async () => {
    const existing = CreditLimit.forUser(orgId, targetUserId, 1000);
    repository.findByUserId.mockResolvedValue(existing);

    const result = await useCase.execute(
      new SetUserCreditLimitCommand(targetUserId, 8000),
    );

    expect(result.id).toBe(existing.id);
    expect(result.monthlyCredits).toBe(8000);
    expect(result.createdAt).toBe(existing.createdAt);
  });

  it('allows a zero allowance (freezes the user)', async () => {
    const result = await useCase.execute(
      new SetUserCreditLimitCommand(targetUserId, 0),
    );

    expect(result.monthlyCredits).toBe(0);
  });

  it('rejects a negative monthly credit value', async () => {
    await expect(
      useCase.execute(new SetUserCreditLimitCommand(targetUserId, -1)),
    ).rejects.toThrow(InvalidCreditLimitError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects when there is no organization in context', async () => {
    context.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(new SetUserCreditLimitCommand(targetUserId, 100)),
    ).rejects.toThrow(UnauthorizedAccessError);
  });
});
