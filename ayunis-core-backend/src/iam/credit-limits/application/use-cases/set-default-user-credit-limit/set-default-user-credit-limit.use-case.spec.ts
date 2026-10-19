import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import { DefaultUserCreditLimit } from 'src/iam/credit-limits/domain/default-user-credit-limit.entity';
import { InvalidCreditLimitError } from 'src/iam/credit-limits/application/credit-limits.errors';
import {
  aDefaultUserCreditLimit,
  createMockCreditLimitRepository,
  TEST_ORG_ID,
} from 'src/iam/credit-limits/application/testing/credit-limit.fixtures';
import { SetDefaultUserCreditLimitUseCase } from './set-default-user-credit-limit.use-case';
import { SetDefaultUserCreditLimitCommand } from './set-default-user-credit-limit.command';

describe('SetDefaultUserCreditLimitUseCase', () => {
  let useCase: SetDefaultUserCreditLimitUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let context: { get: jest.Mock };

  beforeEach(async () => {
    repository = createMockCreditLimitRepository();
    context = { get: jest.fn().mockReturnValue(TEST_ORG_ID) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetDefaultUserCreditLimitUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: ContextService, useValue: context },
      ],
    }).compile();

    useCase = module.get(SetDefaultUserCreditLimitUseCase);
  });

  it('creates the org default when none exists', async () => {
    const result = await useCase.execute(
      new SetDefaultUserCreditLimitCommand(100),
    );

    expect(result).toBeInstanceOf(DefaultUserCreditLimit);
    expect(result.orgId).toBe(TEST_ORG_ID);
    expect(result.monthlyCredits).toBe(100);
    expect(repository.findDefaultUserLimit).toHaveBeenCalledWith(TEST_ORG_ID);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('updates the existing default in place, preserving its identity', async () => {
    const existing = aDefaultUserCreditLimit({ monthlyCredits: 100 });
    repository.findDefaultUserLimit.mockResolvedValue(existing);

    const result = await useCase.execute(
      new SetDefaultUserCreditLimitCommand(250),
    );

    expect(result.id).toBe(existing.id);
    expect(result.createdAt).toBe(existing.createdAt);
    expect(result.monthlyCredits).toBe(250);
  });

  it('allows zero (blocks paid-model usage for users on the default)', async () => {
    const result = await useCase.execute(
      new SetDefaultUserCreditLimitCommand(0),
    );

    expect(result.monthlyCredits).toBe(0);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects %p and persists nothing',
    async (monthlyCredits) => {
      await expect(
        useCase.execute(new SetDefaultUserCreditLimitCommand(monthlyCredits)),
      ).rejects.toBeInstanceOf(InvalidCreditLimitError);
      expect(repository.save).not.toHaveBeenCalled();
    },
  );

  it('rejects when there is no organization in context', async () => {
    context.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(new SetDefaultUserCreditLimitCommand(100)),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
