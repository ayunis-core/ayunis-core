import { Test, type TestingModule } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { GetMonthlyCreditUsageForApiKeysUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-api-keys/get-monthly-credit-usage-for-api-keys.use-case';
import { ListApiKeysByOrgUseCase } from 'src/iam/api-keys/application/use-cases/list-api-keys-by-org/list-api-keys-by-org.use-case';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import {
  anApiKeyCreditLimit,
  createMockCreditLimitRepository,
  TEST_API_KEY_ID,
  TEST_ORG_ID,
} from 'src/iam/credit-limits/application/testing/credit-limit.fixtures';
import { GetApiKeyCreditLimitsOverviewQuery } from './get-api-key-credit-limits-overview.query';
import { GetApiKeyCreditLimitsOverviewUseCase } from './get-api-key-credit-limits-overview.use-case';

describe('GetApiKeyCreditLimitsOverviewUseCase', () => {
  let useCase: GetApiKeyCreditLimitsOverviewUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;
  let context: { get: jest.Mock };
  let listApiKeys: { execute: jest.Mock };
  let getUsage: { execute: jest.Mock };

  const since = new Date('2026-07-10T00:00:00.000Z');

  beforeEach(async () => {
    repository = createMockCreditLimitRepository();
    repository.findApiKeyLimits.mockResolvedValue([anApiKeyCreditLimit()]);
    context = { get: jest.fn().mockReturnValue(TEST_ORG_ID) };
    listApiKeys = {
      execute: jest
        .fn()
        .mockResolvedValue([{ id: TEST_API_KEY_ID, name: 'Finance export' }]),
    };
    getUsage = {
      execute: jest.fn().mockResolvedValue(new Map([[TEST_API_KEY_ID, 1250]])),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetApiKeyCreditLimitsOverviewUseCase,
        { provide: CreditLimitRepository, useValue: repository },
        { provide: ContextService, useValue: context },
        { provide: ListApiKeysByOrgUseCase, useValue: listApiKeys },
        {
          provide: GetMonthlyCreditUsageForApiKeysUseCase,
          useValue: getUsage,
        },
      ],
    }).compile();

    useCase = module.get(GetApiKeyCreditLimitsOverviewUseCase);
  });

  it('enriches configured API key limits with name and consumption', async () => {
    await expect(useCase.execute()).resolves.toEqual([
      {
        apiKeyId: TEST_API_KEY_ID,
        name: 'Finance export',
        monthlyCredits: 5000,
        creditsUsed: 1250,
      },
    ]);
  });

  it('forwards an explicit usage start to the batched query', async () => {
    await useCase.execute(new GetApiKeyCreditLimitsOverviewQuery(since));

    expect(getUsage.execute).toHaveBeenCalledWith(
      expect.objectContaining({ since }),
    );
  });

  it('returns an empty list without enrichment when no limits exist', async () => {
    repository.findApiKeyLimits.mockResolvedValue([]);

    await expect(useCase.execute()).resolves.toEqual([]);
    expect(listApiKeys.execute).not.toHaveBeenCalled();
    expect(getUsage.execute).not.toHaveBeenCalled();
  });

  it('preserves an orphaned limit without exposing another key name or usage', async () => {
    listApiKeys.execute.mockResolvedValue([]);

    await expect(useCase.execute()).resolves.toEqual([
      {
        apiKeyId: TEST_API_KEY_ID,
        name: '',
        monthlyCredits: 5000,
        creditsUsed: 0,
      },
    ]);
    expect(getUsage.execute).not.toHaveBeenCalled();
  });

  it('rejects when there is no organization in context', async () => {
    context.get.mockReturnValue(undefined);

    await expect(useCase.execute()).rejects.toThrow(UnauthorizedAccessError);
  });
});
