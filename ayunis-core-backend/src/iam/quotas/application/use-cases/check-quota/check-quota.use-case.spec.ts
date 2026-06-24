import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { CheckQuotaUseCase } from './check-quota.use-case';
import { CheckQuotaQuery } from './check-quota.query';
import { UsageQuotaRepositoryPort } from '../../ports/usage-quota.repository.port';
import { QuotaLimitResolverService } from '../../services/quota-limit-resolver.service';
import { IsUsageBasedSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/is-usage-based-subscription/is-usage-based-subscription.use-case';
import { QuotaType } from '../../../domain/quota-type.enum';
import { UsageQuota } from '../../../domain/usage-quota.entity';
import { QuotaExceededError } from '../../quotas.errors';

describe('CheckQuotaUseCase', () => {
  let useCase: CheckQuotaUseCase;
  let usageQuotaRepository: jest.Mocked<UsageQuotaRepositoryPort>;
  let limitResolver: jest.Mocked<QuotaLimitResolverService>;
  let isUsageBasedSubscriptionUseCase: jest.Mocked<IsUsageBasedSubscriptionUseCase>;

  const userId = 'user-id' as UUID;
  const orgId = 'org-id' as UUID;
  const quotaType = QuotaType.FAIR_USE_MESSAGES_MEDIUM;

  beforeEach(async () => {
    usageQuotaRepository = {
      checkAndIncrement: jest.fn(),
      incrementAndGet: jest.fn(),
    };

    limitResolver = {
      resolve: jest.fn().mockResolvedValue({ limit: 10, windowMs: 60_000 }),
    } as unknown as jest.Mocked<QuotaLimitResolverService>;

    isUsageBasedSubscriptionUseCase = {
      execute: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<IsUsageBasedSubscriptionUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckQuotaUseCase,
        { provide: UsageQuotaRepositoryPort, useValue: usageQuotaRepository },
        { provide: QuotaLimitResolverService, useValue: limitResolver },
        {
          provide: IsUsageBasedSubscriptionUseCase,
          useValue: isUsageBasedSubscriptionUseCase,
        },
      ],
    }).compile();

    useCase = module.get<CheckQuotaUseCase>(CheckQuotaUseCase);
  });

  it('skips enforcement entirely when the org has an active usage-based subscription', async () => {
    isUsageBasedSubscriptionUseCase.execute.mockResolvedValue(true);

    await useCase.execute(new CheckQuotaQuery(userId, orgId, quotaType));

    expect(isUsageBasedSubscriptionUseCase.execute).toHaveBeenCalledTimes(1);
    expect(limitResolver.resolve).not.toHaveBeenCalled();
    expect(usageQuotaRepository.checkAndIncrement).not.toHaveBeenCalled();
  });

  it('enforces the quota when the org is not usage-based and the limit is not exceeded', async () => {
    isUsageBasedSubscriptionUseCase.execute.mockResolvedValue(false);
    usageQuotaRepository.checkAndIncrement.mockResolvedValue({
      quota: new UsageQuota({
        userId,
        quotaType,
        count: 3,
        windowDurationMs: 60_000,
      }),
      exceeded: false,
    });

    await expect(
      useCase.execute(new CheckQuotaQuery(userId, orgId, quotaType)),
    ).resolves.toBeUndefined();

    expect(limitResolver.resolve).toHaveBeenCalledWith(quotaType);
    expect(usageQuotaRepository.checkAndIncrement).toHaveBeenCalledWith(
      userId,
      quotaType,
      60_000,
      10,
    );
  });

  it('throws QuotaExceededError when the org is not usage-based and the limit is exceeded', async () => {
    isUsageBasedSubscriptionUseCase.execute.mockResolvedValue(false);
    usageQuotaRepository.checkAndIncrement.mockResolvedValue({
      quota: new UsageQuota({
        userId,
        quotaType,
        count: 10,
        windowDurationMs: 60_000,
      }),
      exceeded: true,
    });

    await expect(
      useCase.execute(new CheckQuotaQuery(userId, orgId, quotaType)),
    ).rejects.toBeInstanceOf(QuotaExceededError);
  });
});
