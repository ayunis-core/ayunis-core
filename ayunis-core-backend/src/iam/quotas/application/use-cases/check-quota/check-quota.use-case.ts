import { Injectable, Logger } from '@nestjs/common';
import { UsageQuotaRepositoryPort } from 'src/iam/quotas/application/ports/usage-quota.repository.port';
import { QuotaLimitResolverService } from 'src/iam/quotas/application/services/quota-limit-resolver.service';
import { CheckQuotaQuery } from './check-quota.query';
import { QuotaExceededError } from 'src/iam/quotas/application/quotas.errors';
import { IsUsageBasedSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/is-usage-based-subscription/is-usage-based-subscription.use-case';
import { IsUsageBasedSubscriptionQuery } from 'src/iam/subscriptions/application/use-cases/is-usage-based-subscription/is-usage-based-subscription.query';
import type { UsageQuota } from 'src/iam/quotas/domain/usage-quota.entity';

@Injectable()
export class CheckQuotaUseCase {
  private readonly logger = new Logger(CheckQuotaUseCase.name);

  constructor(
    private readonly usageQuotaRepository: UsageQuotaRepositoryPort,
    private readonly limitResolver: QuotaLimitResolverService,
    private readonly isUsageBasedSubscriptionUseCase: IsUsageBasedSubscriptionUseCase,
  ) {}

  async execute(query: CheckQuotaQuery): Promise<void> {
    const isUsageBased = await this.isUsageBasedSubscriptionUseCase.execute(
      new IsUsageBasedSubscriptionQuery(query.orgId),
    );
    if (isUsageBased) {
      this.logger.debug(
        { orgId: query.orgId, quotaType: query.quotaType },
        'Skipping fair-use quota for usage-based org',
      );
      return;
    }

    await this.checkAndIncrement(query);
  }

  private async checkAndIncrement(query: CheckQuotaQuery): Promise<void> {
    const { limit, windowMs } = await this.limitResolver.resolve(
      query.quotaType,
    );
    this.logger.debug(
      { userId: query.userId, quotaType: query.quotaType, limit },
      'Checking quota',
    );
    const { quota, exceeded } =
      await this.usageQuotaRepository.checkAndIncrement(
        query.userId,
        query.quotaType,
        windowMs,
        limit,
      );

    if (exceeded) {
      this.throwQuotaExceeded(query, quota, limit, windowMs);
    }
    this.logger.debug(
      {
        userId: query.userId,
        quotaType: query.quotaType,
        count: quota.count,
        limit,
        remaining: limit - quota.count,
      },
      'Quota check passed',
    );
  }

  private throwQuotaExceeded(
    query: CheckQuotaQuery,
    quota: UsageQuota,
    limit: number,
    windowMs: number,
  ): never {
    const retryAfterSeconds = Math.ceil(quota.getRemainingTime() / 1000);
    this.logger.warn(
      {
        userId: query.userId,
        quotaType: query.quotaType,
        count: quota.count,
        limit,
        retryAfterSeconds,
      },
      'Quota exceeded',
    );
    throw new QuotaExceededError(
      query.quotaType,
      limit,
      windowMs,
      retryAfterSeconds,
      { currentCount: quota.count },
    );
  }
}
