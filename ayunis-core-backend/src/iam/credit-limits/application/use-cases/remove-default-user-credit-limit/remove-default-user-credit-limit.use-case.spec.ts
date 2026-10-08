import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import {
  createMockCreditLimitRepository,
  TEST_ORG_ID,
} from 'src/iam/credit-limits/application/testing/credit-limit.fixtures';
import { RemoveDefaultUserCreditLimitUseCase } from './remove-default-user-credit-limit.use-case';

describe('RemoveDefaultUserCreditLimitUseCase', () => {
  let useCase: RemoveDefaultUserCreditLimitUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;

  beforeEach(async () => {
    repository = createMockCreditLimitRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveDefaultUserCreditLimitUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: ContextService, useValue: { get: () => TEST_ORG_ID } },
      ],
    }).compile();

    useCase = module.get(RemoveDefaultUserCreditLimitUseCase);
  });

  it('deletes only the org default', async () => {
    await useCase.execute();

    expect(repository.deleteDefaultUserLimit).toHaveBeenCalledWith(TEST_ORG_ID);
    expect(repository.deleteByUserId).not.toHaveBeenCalled();
    expect(repository.deleteByOrg).not.toHaveBeenCalled();
  });
});
