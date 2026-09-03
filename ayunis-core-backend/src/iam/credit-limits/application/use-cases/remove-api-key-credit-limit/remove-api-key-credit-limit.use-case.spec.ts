import { Test, type TestingModule } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import {
  createMockCreditLimitRepository,
  TEST_API_KEY_ID,
  TEST_ORG_ID,
} from 'src/iam/credit-limits/application/testing/credit-limit.fixtures';
import { RemoveApiKeyCreditLimitCommand } from './remove-api-key-credit-limit.command';
import { RemoveApiKeyCreditLimitUseCase } from './remove-api-key-credit-limit.use-case';

describe('RemoveApiKeyCreditLimitUseCase', () => {
  let useCase: RemoveApiKeyCreditLimitUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let context: { get: jest.Mock };

  beforeEach(async () => {
    repository = createMockCreditLimitRepository();
    context = { get: jest.fn().mockReturnValue(TEST_ORG_ID) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveApiKeyCreditLimitUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: ContextService, useValue: context },
      ],
    }).compile();

    useCase = module.get(RemoveApiKeyCreditLimitUseCase);
  });

  it('removes the API key limit in the caller organization', async () => {
    await useCase.execute(new RemoveApiKeyCreditLimitCommand(TEST_API_KEY_ID));

    expect(repository.deleteByApiKeyId).toHaveBeenCalledWith(
      TEST_ORG_ID,
      TEST_API_KEY_ID,
    );
  });

  it('is idempotent when no limit exists', async () => {
    await expect(
      useCase.execute(new RemoveApiKeyCreditLimitCommand(TEST_API_KEY_ID)),
    ).resolves.toBeUndefined();
  });

  it('rejects when there is no organization in context', async () => {
    context.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(new RemoveApiKeyCreditLimitCommand(TEST_API_KEY_ID)),
    ).rejects.toThrow(UnauthorizedAccessError);
  });
});
