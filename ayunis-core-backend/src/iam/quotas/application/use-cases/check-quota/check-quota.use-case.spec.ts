import type { UUID } from 'crypto';
import { CheckQuotaUseCase } from './check-quota.use-case';
import { CheckQuotaQuery } from './check-quota.query';
import type { UsageQuotaRepositoryPort } from '../../ports/usage-quota.repository.port';
import type { QuotaLimitResolverService } from '../../services/quota-limit-resolver.service';
import { QuotaType } from '../../../domain/quota-type.enum';
import { UsageQuota } from '../../../domain/usage-quota.entity';
import type { PrincipalRef } from '../../../domain/principal-ref';
import { QuotaExceededError } from '../../quotas.errors';

const USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const API_KEY_ID = '22222222-2222-4222-8222-222222222222' as UUID;

describe('CheckQuotaUseCase', () => {
  let useCase: CheckQuotaUseCase;
  let repo: jest.Mocked<UsageQuotaRepositoryPort>;
  let resolver: jest.Mocked<QuotaLimitResolverService>;

  beforeEach(() => {
    repo = {
      checkAndIncrement: jest.fn(),
    } as unknown as jest.Mocked<UsageQuotaRepositoryPort>;

    resolver = {
      resolve: jest.fn().mockResolvedValue({ limit: 100, windowMs: 60_000 }),
    } as unknown as jest.Mocked<QuotaLimitResolverService>;

    useCase = new CheckQuotaUseCase(repo, resolver);
  });

  function quotaWithCount(principal: PrincipalRef, count: number): UsageQuota {
    return new UsageQuota({
      principal,
      quotaType: QuotaType.FAIR_USE_MESSAGES_MEDIUM,
      count,
      windowDurationMs: 60_000,
    });
  }

  it('passes the user principal through to the repository', async () => {
    const principal: PrincipalRef = { kind: 'user', userId: USER_ID };
    repo.checkAndIncrement.mockResolvedValue({
      quota: quotaWithCount(principal, 1),
      exceeded: false,
    });

    await useCase.execute(
      new CheckQuotaQuery(principal, QuotaType.FAIR_USE_MESSAGES_MEDIUM),
    );

    expect(repo.checkAndIncrement).toHaveBeenCalledWith(
      principal,
      QuotaType.FAIR_USE_MESSAGES_MEDIUM,
      60_000,
      100,
    );
  });

  it('passes the api-key principal through to the repository', async () => {
    const principal: PrincipalRef = { kind: 'apiKey', apiKeyId: API_KEY_ID };
    repo.checkAndIncrement.mockResolvedValue({
      quota: quotaWithCount(principal, 1),
      exceeded: false,
    });

    await useCase.execute(
      new CheckQuotaQuery(principal, QuotaType.FAIR_USE_MESSAGES_HIGH),
    );

    expect(repo.checkAndIncrement).toHaveBeenCalledWith(
      principal,
      QuotaType.FAIR_USE_MESSAGES_HIGH,
      60_000,
      100,
    );
  });

  it('throws QuotaExceededError with retry-after when the bucket is full', async () => {
    const principal: PrincipalRef = { kind: 'apiKey', apiKeyId: API_KEY_ID };
    const fullQuota = quotaWithCount(principal, 100);
    jest.spyOn(fullQuota, 'getRemainingTime').mockReturnValue(45_000);
    repo.checkAndIncrement.mockResolvedValue({
      quota: fullQuota,
      exceeded: true,
    });

    let caught: unknown;
    try {
      await useCase.execute(
        new CheckQuotaQuery(principal, QuotaType.FAIR_USE_MESSAGES_MEDIUM),
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(QuotaExceededError);
    const error = caught as QuotaExceededError;
    expect(error.metadata).toMatchObject({
      retryAfterSeconds: 45,
      currentCount: 100,
      limit: 100,
    });
  });

  it('does not throw when the bucket is under the limit', async () => {
    const principal: PrincipalRef = { kind: 'user', userId: USER_ID };
    repo.checkAndIncrement.mockResolvedValue({
      quota: quotaWithCount(principal, 50),
      exceeded: false,
    });

    await expect(
      useCase.execute(
        new CheckQuotaQuery(principal, QuotaType.FAIR_USE_MESSAGES_MEDIUM),
      ),
    ).resolves.toBeUndefined();
  });
});
