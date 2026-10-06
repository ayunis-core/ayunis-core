import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import {
  aDefaultUserCreditLimit,
  createMockCreditLimitRepository,
  TEST_ORG_ID,
} from 'src/iam/credit-limits/application/testing/credit-limit.fixtures';
import { GetDefaultUserCreditLimitUseCase } from './get-default-user-credit-limit.use-case';

describe('GetDefaultUserCreditLimitUseCase', () => {
  let useCase: GetDefaultUserCreditLimitUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;

  beforeEach(async () => {
    repository = createMockCreditLimitRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetDefaultUserCreditLimitUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: ContextService, useValue: { get: () => TEST_ORG_ID } },
      ],
    }).compile();

    useCase = module.get(GetDefaultUserCreditLimitUseCase);
  });

  it('returns null when no default is set', async () => {
    await expect(useCase.execute()).resolves.toBeNull();
    expect(repository.findDefaultUserLimit).toHaveBeenCalledWith(TEST_ORG_ID);
  });

  it('returns the configured default', async () => {
    const existing = aDefaultUserCreditLimit({ monthlyCredits: 100 });
    repository.findDefaultUserLimit.mockResolvedValue(existing);

    await expect(useCase.execute()).resolves.toBe(existing);
  });
});
