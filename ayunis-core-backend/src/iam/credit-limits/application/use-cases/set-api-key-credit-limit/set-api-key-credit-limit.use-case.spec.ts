import { Test, type TestingModule } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ListApiKeysByOrgUseCase } from 'src/iam/api-keys/application/use-cases/list-api-keys-by-org/list-api-keys-by-org.use-case';
import { ApiKeyCreditLimit } from 'src/iam/credit-limits/domain/api-key-credit-limit.entity';
import {
  CreditLimitTargetNotFoundError,
  InvalidCreditLimitError,
} from 'src/iam/credit-limits/application/credit-limits.errors';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import {
  anApiKeyCreditLimit,
  createMockCreditLimitRepository,
  TEST_API_KEY_ID,
  TEST_ORG_ID,
} from 'src/iam/credit-limits/application/testing/credit-limit.fixtures';
import { SetApiKeyCreditLimitCommand } from './set-api-key-credit-limit.command';
import { SetApiKeyCreditLimitUseCase } from './set-api-key-credit-limit.use-case';

describe('SetApiKeyCreditLimitUseCase', () => {
  let useCase: SetApiKeyCreditLimitUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let context: { get: jest.Mock };
  let listApiKeys: { execute: jest.Mock };

  beforeEach(async () => {
    repository = createMockCreditLimitRepository();
    context = { get: jest.fn().mockReturnValue(TEST_ORG_ID) };
    listApiKeys = {
      execute: jest.fn().mockResolvedValue([{ id: TEST_API_KEY_ID }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetApiKeyCreditLimitUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: ContextService, useValue: context },
        { provide: ListApiKeysByOrgUseCase, useValue: listApiKeys },
      ],
    }).compile();

    useCase = module.get(SetApiKeyCreditLimitUseCase);
  });

  it('creates an API-key-scoped limit when none exists', async () => {
    const result = await useCase.execute(
      new SetApiKeyCreditLimitCommand(TEST_API_KEY_ID, 5000),
    );

    expect(result).toBeInstanceOf(ApiKeyCreditLimit);
    expect(result.apiKeyId).toBe(TEST_API_KEY_ID);
    expect(result.monthlyCredits).toBe(5000);
  });

  it('updates an existing limit while preserving its identity', async () => {
    const existing = anApiKeyCreditLimit({ monthlyCredits: 1000 });
    repository.findByApiKeyId.mockResolvedValue(existing);

    const result = await useCase.execute(
      new SetApiKeyCreditLimitCommand(TEST_API_KEY_ID, 2500),
    );

    expect(result.id).toBe(existing.id);
    expect(result.createdAt).toBe(existing.createdAt);
    expect(result.monthlyCredits).toBe(2500);
  });

  it('allows zero credits to freeze an API key', async () => {
    const result = await useCase.execute(
      new SetApiKeyCreditLimitCommand(TEST_API_KEY_ID, 0),
    );

    expect(result.monthlyCredits).toBe(0);
  });

  it('rejects a negative monthly credit value', async () => {
    await expect(
      useCase.execute(new SetApiKeyCreditLimitCommand(TEST_API_KEY_ID, -1)),
    ).rejects.toThrow(InvalidCreditLimitError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects an API key outside the caller organization', async () => {
    listApiKeys.execute.mockResolvedValue([]);

    await expect(
      useCase.execute(new SetApiKeyCreditLimitCommand(TEST_API_KEY_ID, 5000)),
    ).rejects.toThrow(CreditLimitTargetNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects when there is no organization in context', async () => {
    context.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(new SetApiKeyCreditLimitCommand(TEST_API_KEY_ID, 5000)),
    ).rejects.toThrow(UnauthorizedAccessError);
  });
});
