import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { CreditLimit } from '../../../domain/credit-limit.entity';
import { ListCreditLimitsUseCase } from './list-credit-limits.use-case';

describe('ListCreditLimitsUseCase', () => {
  let useCase: ListCreditLimitsUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let context: { get: jest.Mock };

  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const userId = '22222222-2222-2222-2222-222222222222' as UUID;
  const teamId = '33333333-3333-3333-3333-333333333333' as UUID;

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findByOrg: jest.fn().mockResolvedValue([]),
      findByUserId: jest.fn(),
      findByTeamId: jest.fn(),
      findByTeamIds: jest.fn(),
      deleteByUserId: jest.fn(),
      deleteByTeamId: jest.fn(),
    };
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
      CreditLimit.forUser(orgId, userId, 5000),
      CreditLimit.forTeam(orgId, teamId, 20000),
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
