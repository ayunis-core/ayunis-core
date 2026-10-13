import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { UsageRepository } from 'src/domain/usage/application/ports/usage.repository';
import {
  createMockUsageRepository,
  TEST_API_KEY_ID,
  TEST_ORGANIZATION_ID,
} from 'src/domain/usage/application/testing/usage.fixtures';
import {
  InvalidDateRangeError,
  UnexpectedUsageError,
} from 'src/domain/usage/application/usage.errors';
import { ApiKeyUsageItem } from 'src/domain/usage/domain/api-key-usage-item.entity';
import { GetApiKeyUsageQuery } from './get-api-key-usage.query';
import { GetApiKeyUsageUseCase } from './get-api-key-usage.use-case';

describe('GetApiKeyUsageUseCase', () => {
  let useCase: GetApiKeyUsageUseCase;
  let repository: jest.Mocked<UsageRepository>;

  const organizationId = TEST_ORGANIZATION_ID;

  beforeEach(async () => {
    repository = createMockUsageRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetApiKeyUsageUseCase,
        { provide: UsageRepository, useValue: repository },
      ],
    }).compile();

    useCase = module.get(GetApiKeyUsageUseCase);
  });

  it('returns the usage per API key for the requested organization and range', async () => {
    const startDate = new Date('2026-03-01T00:00:00.000Z');
    const endDate = new Date('2026-04-01T00:00:00.000Z');
    const item = new ApiKeyUsageItem({
      apiKeyId: TEST_API_KEY_ID,
      name: 'Citizen portal',
      revokedAt: null,
      expiresAt: null,
      inputTokens: 1200,
      outputTokens: 300,
      totalTokens: 1500,
      requests: 4,
      credits: 12.5,
      unpricedRequests: 0,
      lastUsedAt: new Date('2026-03-10T08:00:00.000Z'),
    });
    repository.getApiKeyUsage.mockResolvedValue([item]);

    const result = await useCase.execute(
      new GetApiKeyUsageQuery({ organizationId, startDate, endDate }),
    );

    expect(result).toEqual([item]);
    expect(repository.getApiKeyUsage).toHaveBeenCalledWith({
      organizationId,
      startDate,
      endDate,
    });
  });

  it('allows querying all usage without a date range', async () => {
    await useCase.execute(new GetApiKeyUsageQuery({ organizationId }));

    expect(repository.getApiKeyUsage).toHaveBeenCalledWith({
      organizationId,
      startDate: undefined,
      endDate: undefined,
    });
  });

  it('rejects a range with only a start date', async () => {
    const query = new GetApiKeyUsageQuery({
      organizationId,
      startDate: new Date('2026-03-01T00:00:00.000Z'),
    });

    await expect(useCase.execute(query)).rejects.toThrow(InvalidDateRangeError);
    expect(repository.getApiKeyUsage).not.toHaveBeenCalled();
  });

  it('rejects a range whose start is after its end', async () => {
    const query = new GetApiKeyUsageQuery({
      organizationId,
      startDate: new Date('2026-03-31T00:00:00.000Z'),
      endDate: new Date('2026-03-01T00:00:00.000Z'),
    });

    await expect(useCase.execute(query)).rejects.toThrow(InvalidDateRangeError);
  });

  it('wraps unexpected repository failures', async () => {
    repository.getApiKeyUsage.mockRejectedValue(new Error('connection lost'));

    await expect(
      useCase.execute(new GetApiKeyUsageQuery({ organizationId })),
    ).rejects.toThrow(UnexpectedUsageError);
  });
});
