import type { UUID } from 'crypto';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { UsageRepository } from 'src/domain/usage/application/ports/usage.repository';
import {
  createMockUsageRepository,
  TEST_API_KEY_ID,
  TEST_ORGANIZATION_ID,
  TEST_SECOND_API_KEY_ID,
} from 'src/domain/usage/application/testing/usage.fixtures';
import { GetMonthlyCreditUsageForApiKeysQuery } from './get-monthly-credit-usage-for-api-keys.query';
import { GetMonthlyCreditUsageForApiKeysUseCase } from './get-monthly-credit-usage-for-api-keys.use-case';

describe('GetMonthlyCreditUsageForApiKeysUseCase', () => {
  let useCase: GetMonthlyCreditUsageForApiKeysUseCase;
  let repository: jest.Mocked<UsageRepository>;

  const organizationId = TEST_ORGANIZATION_ID;
  const firstApiKeyId = TEST_API_KEY_ID;
  const secondApiKeyId = TEST_SECOND_API_KEY_ID;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-18T14:30:00.000Z'));
    repository = createMockUsageRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMonthlyCreditUsageForApiKeysUseCase,
        { provide: UsageRepository, useValue: repository },
      ],
    }).compile();

    useCase = module.get(GetMonthlyCreditUsageForApiKeysUseCase);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns batched per-API-key consumption for the current UTC month', async () => {
    const usage = new Map<UUID, number>([
      [firstApiKeyId, 1240.5],
      [secondApiKeyId, 80],
    ]);
    repository.getMonthlyCreditUsagePerApiKey.mockResolvedValue(usage);

    const result = await useCase.execute(
      new GetMonthlyCreditUsageForApiKeysQuery(organizationId, [
        firstApiKeyId,
        secondApiKeyId,
      ]),
    );

    expect(result).toBe(usage);
    expect(repository.getMonthlyCreditUsagePerApiKey).toHaveBeenCalledWith(
      organizationId,
      [firstApiKeyId, secondApiKeyId],
      new Date('2026-03-01T00:00:00.000Z'),
    );
  });

  it('uses a later subscription anchor as the batched usage window start', async () => {
    repository.getMonthlyCreditUsagePerApiKey.mockResolvedValue(new Map());
    const since = new Date('2026-03-15T09:00:00.000Z');

    await useCase.execute(
      new GetMonthlyCreditUsageForApiKeysQuery(
        organizationId,
        [firstApiKeyId],
        since,
      ),
    );

    expect(repository.getMonthlyCreditUsagePerApiKey).toHaveBeenCalledWith(
      organizationId,
      [firstApiKeyId],
      since,
    );
  });
});
