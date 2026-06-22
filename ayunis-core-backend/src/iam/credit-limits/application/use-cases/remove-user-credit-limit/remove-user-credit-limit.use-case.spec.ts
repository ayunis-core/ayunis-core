import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { RemoveUserCreditLimitUseCase } from './remove-user-credit-limit.use-case';
import { RemoveUserCreditLimitCommand } from './remove-user-credit-limit.command';

describe('RemoveUserCreditLimitUseCase', () => {
  let useCase: RemoveUserCreditLimitUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;

  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const userId = '22222222-2222-2222-2222-222222222222' as UUID;

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findUserLimits: jest.fn(),
      findTeamLimits: jest.fn(),
      findByUserId: jest.fn(),
      findByTeamId: jest.fn(),
      findByTeamIds: jest.fn(),
      deleteByUserId: jest.fn().mockResolvedValue(undefined),
      deleteByTeamId: jest.fn().mockResolvedValue(undefined),
      deleteByOrg: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveUserCreditLimitUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: ContextService, useValue: { get: () => orgId } },
      ],
    }).compile();

    useCase = module.get(RemoveUserCreditLimitUseCase);
  });

  it('deletes the limit by user id', async () => {
    await useCase.execute(new RemoveUserCreditLimitCommand(userId));

    expect(repository.deleteByUserId).toHaveBeenCalledWith(orgId, userId);
    expect(repository.deleteByTeamId).not.toHaveBeenCalled();
  });
});
