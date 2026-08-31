import { getLoggerToken } from 'nestjs-pino';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { UsageRepository } from 'src/domain/usage/application/ports/usage.repository';
import {
  createMockUsageRepository,
  TEST_API_KEY_ID,
  TEST_ORGANIZATION_ID,
} from 'src/domain/usage/application/testing/usage.fixtures';
import { GetMonthlyCreditUsageForApiKeyQuery } from './get-monthly-credit-usage-for-api-key.query';
import { GetMonthlyCreditUsageForApiKeyUseCase } from './get-monthly-credit-usage-for-api-key.use-case';

describe('GetMonthlyCreditUsageForApiKeyUseCase', () => {
  let useCase: GetMonthlyCreditUsageForApiKeyUseCase;
  let repository: jest.Mocked<UsageRepository>;

  const organizationId = TEST_ORGANIZATION_ID;
  const apiKeyId = TEST_API_KEY_ID;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-18T14:30:00.000Z'));
    repository = createMockUsageRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMonthlyCreditUsageForApiKeyUseCase,
        { provide: UsageRepository, useValue: repository },
        {
          provide: getLoggerToken(GetMonthlyCreditUsageForApiKeyUseCase.name),
          useValue: createPinoLoggerMock(),
        },
      ],
    }).compile();

    useCase = module.get(GetMonthlyCreditUsageForApiKeyUseCase);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the credits consumed by the API key in the current UTC month', async () => {
    repository.getTotalMonthlyCreditUsageForApiKey.mockResolvedValue(1240.5);

    const result = await useCase.execute(
      new GetMonthlyCreditUsageForApiKeyQuery(organizationId, apiKeyId),
    );

    expect(result).toEqual({ creditsUsed: 1240.5 });
    expect(repository.getTotalMonthlyCreditUsageForApiKey).toHaveBeenCalledWith(
      organizationId,
      apiKeyId,
      new Date('2026-03-01T00:00:00.000Z'),
    );
  });

  it('uses a later subscription anchor as the usage window start', async () => {
    repository.getTotalMonthlyCreditUsageForApiKey.mockResolvedValue(0);
    const since = new Date('2026-03-15T09:00:00.000Z');

    await useCase.execute(
      new GetMonthlyCreditUsageForApiKeyQuery(organizationId, apiKeyId, since),
    );

    expect(repository.getTotalMonthlyCreditUsageForApiKey).toHaveBeenCalledWith(
      organizationId,
      apiKeyId,
      since,
    );
  });
});
