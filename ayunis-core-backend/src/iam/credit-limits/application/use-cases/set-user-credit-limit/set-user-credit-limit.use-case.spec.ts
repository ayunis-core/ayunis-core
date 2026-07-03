import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { UserCreditLimit } from '../../../domain/user-credit-limit.entity';
import {
  CreditLimitTargetNotFoundError,
  InvalidCreditLimitError,
} from '../../credit-limits.errors';
import { SetUserCreditLimitUseCase } from './set-user-credit-limit.use-case';
import { SetUserCreditLimitCommand } from './set-user-credit-limit.command';

describe('SetUserCreditLimitUseCase', () => {
  let useCase: SetUserCreditLimitUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let context: { get: jest.Mock };
  let findUsersByIds: { execute: jest.Mock };

  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const userId = '22222222-2222-2222-2222-222222222222' as UUID;

  beforeEach(async () => {
    repository = {
      save: jest.fn().mockImplementation((limit) => Promise.resolve(limit)),
      findUserLimits: jest.fn(),
      findTeamLimits: jest.fn(),
      findByUserId: jest.fn().mockResolvedValue(null),
      findByTeamId: jest.fn(),
      findByTeamIds: jest.fn(),
      deleteByUserId: jest.fn(),
      deleteByTeamId: jest.fn(),
      deleteByOrg: jest.fn(),
    };
    context = { get: jest.fn().mockReturnValue(orgId) };
    // Default: target is a member of the caller's org.
    findUsersByIds = {
      execute: jest.fn().mockResolvedValue([{ id: userId }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetUserCreditLimitUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: ContextService, useValue: context },
        { provide: FindUsersByIdsUseCase, useValue: findUsersByIds },
      ],
    }).compile();

    useCase = module.get(SetUserCreditLimitUseCase);
  });

  it('creates a new USER-scoped limit when none exists', async () => {
    const result = await useCase.execute(
      new SetUserCreditLimitCommand(userId, 5000),
    );

    expect(result).toBeInstanceOf(UserCreditLimit);
    expect(result.userId).toBe(userId);
    expect(result.monthlyCredits).toBe(5000);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('updates an existing limit in place, preserving its identity', async () => {
    const existing = new UserCreditLimit({
      orgId,
      userId,
      monthlyCredits: 1000,
    });
    repository.findByUserId.mockResolvedValue(existing);

    const result = await useCase.execute(
      new SetUserCreditLimitCommand(userId, 8000),
    );

    expect(result.id).toBe(existing.id);
    expect(result.monthlyCredits).toBe(8000);
    expect(result.createdAt).toBe(existing.createdAt);
  });

  it('allows a zero allowance (freezes the user)', async () => {
    const result = await useCase.execute(
      new SetUserCreditLimitCommand(userId, 0),
    );

    expect(result.monthlyCredits).toBe(0);
  });

  it('rejects a negative monthly credit value', async () => {
    await expect(
      useCase.execute(new SetUserCreditLimitCommand(userId, -1)),
    ).rejects.toThrow(InvalidCreditLimitError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects when there is no organization in context', async () => {
    context.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(new SetUserCreditLimitCommand(userId, 100)),
    ).rejects.toThrow(UnauthorizedAccessError);
  });

  it('rejects a target user outside the caller org and persists nothing', async () => {
    findUsersByIds.execute.mockResolvedValue([]); // not a member of this org

    await expect(
      useCase.execute(new SetUserCreditLimitCommand(userId, 5000)),
    ).rejects.toBeInstanceOf(CreditLimitTargetNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
