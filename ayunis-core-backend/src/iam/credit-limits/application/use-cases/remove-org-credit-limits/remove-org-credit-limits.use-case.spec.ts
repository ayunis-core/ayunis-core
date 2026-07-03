import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { RemoveOrgCreditLimitsUseCase } from './remove-org-credit-limits.use-case';
import { RemoveOrgCreditLimitsCommand } from './remove-org-credit-limits.command';

describe('RemoveOrgCreditLimitsUseCase', () => {
  let useCase: RemoveOrgCreditLimitsUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;

  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findUserLimits: jest.fn(),
      findTeamLimits: jest.fn(),
      findByUserId: jest.fn(),
      findByTeamId: jest.fn(),
      findByTeamIds: jest.fn(),
      deleteByUserId: jest.fn(),
      deleteByTeamId: jest.fn(),
      deleteByOrg: jest.fn().mockResolvedValue(undefined),
    };

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
