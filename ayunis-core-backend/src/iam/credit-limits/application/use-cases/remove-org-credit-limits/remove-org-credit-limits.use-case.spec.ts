import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import {
  createMockCreditLimitRepository,
  TEST_ORG_ID,
} from '../../testing/credit-limit.fixtures';
import { RemoveOrgCreditLimitsUseCase } from './remove-org-credit-limits.use-case';
import { RemoveOrgCreditLimitsCommand } from './remove-org-credit-limits.command';

describe('RemoveOrgCreditLimitsUseCase', () => {
  let useCase: RemoveOrgCreditLimitsUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;

  const orgId = TEST_ORG_ID;

  beforeEach(async () => {
    repository = createMockCreditLimitRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveOrgCreditLimitsUseCase,
        { provide: CreditLimitRepository, useValue: repository },
      ],
    }).compile();

    useCase = module.get(RemoveOrgCreditLimitsUseCase);
  });

  it('deletes all credit limits for the org', async () => {
    await useCase.execute(new RemoveOrgCreditLimitsCommand(orgId));

    expect(repository.deleteByOrg).toHaveBeenCalledWith(orgId);
  });
});
