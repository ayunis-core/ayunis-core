import { Test, type TestingModule } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { GetMonthlyCreditUsageForApiKeyUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-api-key/get-monthly-credit-usage-for-api-key.use-case';
import { ApiKeyCreditLimitExceededError } from 'src/iam/credit-limits/application/credit-limits.errors';
import { ResolveCreditLimitForApiKeyUseCase } from 'src/iam/credit-limits/application/use-cases/resolve-credit-limit-for-api-key/resolve-credit-limit-for-api-key.use-case';
import { IsUsageBasedSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/is-usage-based-subscription/is-usage-based-subscription.use-case';
import { ApiKeyCreditLimitGuardService } from './api-key-credit-limit-guard.service';

describe('ApiKeyCreditLimitGuardService', () => {
  let service: ApiKeyCreditLimitGuardService;
  let getLimit: { execute: jest.Mock };
  let getUsage: { execute: jest.Mock };
  let isUsageBased: { execute: jest.Mock };

  const orgId = 'org-1' as UUID;
  const apiKeyId = 'api-key-1' as UUID;

  beforeEach(async () => {
    getLimit = {
      execute: jest.fn().mockResolvedValue({ monthlyCreditLimit: null }),
    };
    getUsage = { execute: jest.fn().mockResolvedValue({ creditsUsed: 0 }) };
    isUsageBased = { execute: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyCreditLimitGuardService,
        {
          provide: ResolveCreditLimitForApiKeyUseCase,
          useValue: getLimit,
        },
        {
          provide: GetMonthlyCreditUsageForApiKeyUseCase,
          useValue: getUsage,
        },
        {
          provide: IsUsageBasedSubscriptionUseCase,
          useValue: isUsageBased,
        },
        {
          provide: getLoggerToken(ApiKeyCreditLimitGuardService.name),
          useValue: createPinoLoggerMock(),
        },
      ],
    }).compile();

    service = module.get(ApiKeyCreditLimitGuardService);
  });

  it('short-circuits without measuring usage when no limit is configured', async () => {
    await expect(
      service.ensureWithinLimit(orgId, apiKeyId),
    ).resolves.toBeUndefined();
    expect(isUsageBased.execute).not.toHaveBeenCalled();
    expect(getUsage.execute).not.toHaveBeenCalled();
  });

  it('passes when the API key is below its limit', async () => {
    getLimit.execute.mockResolvedValue({ monthlyCreditLimit: 1000 });
    getUsage.execute.mockResolvedValue({ creditsUsed: 999 });

    await expect(
      service.ensureWithinLimit(orgId, apiKeyId),
    ).resolves.toBeUndefined();
  });

  it('blocks when the API key limit is exactly reached', async () => {
    getLimit.execute.mockResolvedValue({ monthlyCreditLimit: 1000 });
    getUsage.execute.mockResolvedValue({ creditsUsed: 1000 });

    await expect(service.ensureWithinLimit(orgId, apiKeyId)).rejects.toThrow(
      ApiKeyCreditLimitExceededError,
    );
  });

  it('blocks an API key with a zero allowance', async () => {
    getLimit.execute.mockResolvedValue({ monthlyCreditLimit: 0 });

    await expect(service.ensureWithinLimit(orgId, apiKeyId)).rejects.toThrow(
      ApiKeyCreditLimitExceededError,
    );
  });

  it('does not enforce leftover limits for a non-usage subscription', async () => {
    getLimit.execute.mockResolvedValue({ monthlyCreditLimit: 0 });
    isUsageBased.execute.mockResolvedValue(false);

    await expect(
      service.ensureWithinLimit(orgId, apiKeyId),
    ).resolves.toBeUndefined();
    expect(getUsage.execute).not.toHaveBeenCalled();
  });
});
