import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { CreditLimitScope } from '../../../domain/value-objects/credit-limit-scope.enum';
import {
  CreditLimitTargetNotFoundError,
  InvalidCreditLimitError,
} from '../../credit-limits.errors';
import {
  aUserCreditLimit,
  createMockCreditLimitRepository,
  TEST_ORG_ID,
  TEST_USER_ID,
} from '../../testing/credit-limit.fixtures';
import { SetUserCreditLimitUseCase } from './set-user-credit-limit.use-case';
import { SetUserCreditLimitCommand } from './set-user-credit-limit.command';

describe('SetUserCreditLimitUseCase', () => {
  let useCase: SetUserCreditLimitUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let context: { get: jest.Mock };
  let findUsersByIds: { execute: jest.Mock };

  const orgId = TEST_ORG_ID;
  const targetUserId = TEST_USER_ID;

  beforeEach(async () => {
    repository = createMockCreditLimitRepository();
    context = { get: jest.fn().mockReturnValue(orgId) };
    // Default: target is a member of the caller's org.
    findUsersByIds = {
      execute: jest.fn().mockResolvedValue([{ id: targetUserId }]),
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
      new SetUserCreditLimitCommand(targetUserId, 5000),
    );

    expect(result.target).toEqual({
      scope: CreditLimitScope.USER,
      userId: targetUserId,
    });
    expect(result.monthlyCredits).toBe(5000);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('updates an existing limit in place, preserving its identity', async () => {
    const existing = aUserCreditLimit({ monthlyCredits: 1000 });
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

  it('rejects a target user outside the caller org and persists nothing', async () => {
    findUsersByIds.execute.mockResolvedValue([]); // not a member of this org

    await expect(
      useCase.execute(new SetUserCreditLimitCommand(targetUserId, 5000)),
    ).rejects.toBeInstanceOf(CreditLimitTargetNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
