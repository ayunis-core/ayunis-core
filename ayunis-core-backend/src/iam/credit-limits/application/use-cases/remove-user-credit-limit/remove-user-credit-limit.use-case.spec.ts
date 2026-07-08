import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import {
  createMockCreditLimitRepository,
  TEST_ORG_ID,
  TEST_USER_ID,
} from '../../testing/credit-limit.fixtures';
import { RemoveUserCreditLimitUseCase } from './remove-user-credit-limit.use-case';
import { RemoveUserCreditLimitCommand } from './remove-user-credit-limit.command';

describe('RemoveUserCreditLimitUseCase', () => {
  let useCase: RemoveUserCreditLimitUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;

  const orgId = TEST_ORG_ID;
  const userId = TEST_USER_ID;

  beforeEach(async () => {
    repository = createMockCreditLimitRepository();

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
