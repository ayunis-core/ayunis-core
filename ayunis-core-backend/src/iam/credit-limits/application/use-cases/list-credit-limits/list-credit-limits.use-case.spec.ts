import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import {
  aTeamCreditLimit,
  aUserCreditLimit,
  createMockCreditLimitRepository,
  TEST_ORG_ID,
} from '../../testing/credit-limit.fixtures';
import { ListCreditLimitsUseCase } from './list-credit-limits.use-case';

describe('ListCreditLimitsUseCase', () => {
  let useCase: ListCreditLimitsUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let context: { get: jest.Mock };

  const orgId = TEST_ORG_ID;

  beforeEach(async () => {
    repository = createMockCreditLimitRepository();
    context = { get: jest.fn().mockReturnValue(orgId) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListCreditLimitsUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: ContextService, useValue: context },
      ],
    }).compile();

    useCase = module.get(ListCreditLimitsUseCase);
  });

  it("returns the org's configured limits, scoped by the org from context", async () => {
    const limits = [
      aUserCreditLimit({ monthlyCredits: 5000 }),
      aTeamCreditLimit({ monthlyCredits: 20000 }),
    ];
    repository.findByOrg.mockResolvedValue(limits);

    const result = await useCase.execute();

    expect(result).toBe(limits);
    expect(repository.findByOrg).toHaveBeenCalledWith(orgId);
  });

  it('returns an empty list when nothing is configured', async () => {
    const result = await useCase.execute();

    expect(result).toEqual([]);
  });

  it('rejects when there is no organization in context', async () => {
    context.get.mockReturnValue(undefined);

    await expect(useCase.execute()).rejects.toThrow(UnauthorizedAccessError);
    expect(repository.findByOrg).not.toHaveBeenCalled();
  });
});
