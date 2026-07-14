import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedQuotaError } from 'src/iam/quotas/application/quotas.errors';
import { Injectable, Logger } from '@nestjs/common';
import { UsageQuotaRepositoryPort } from '../../ports/usage-quota.repository.port';
import { QuotaLimitResolverService } from '../../services/quota-limit-resolver.service';
import { CheckQuotaQuery } from './check-quota.query';
import { QuotaExceededError } from '../../quotas.errors';
import { IsUsageBasedSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/is-usage-based-subscription/is-usage-based-subscription.use-case';
import { IsUsageBasedSubscriptionQuery } from 'src/iam/subscriptions/application/use-cases/is-usage-based-subscription/is-usage-based-subscription.query';

@Injectable()
export class CheckQuotaUseCase {
  private readonly logger = new Logger(CheckQuotaUseCase.name);

  constructor(
    private readonly usageQuotaRepository: UsageQuotaRepositoryPort,
    private readonly limitResolver: QuotaLimitResolverService,
    private readonly isUsageBasedSubscriptionUseCase: IsUsageBasedSubscriptionUseCase,
  ) {}

  // Quota checking intentionally performs all policy checks before returning.
  // eslint-disable-next-line max-lines-per-function
  @HandleUnexpectedErrors(UnexpectedQuotaError)
  async execute(query: CheckQuotaQuery): Promise<void> {
    // Fair-use is the protection of last resort for flat-fee plans.
    // Usage-based orgs already self-limit via their purchased credit budget
    // (enforced by CreditBudgetGuardService), so applying fair-use on top
    // would double-cap them.
    const isUsageBased = await this.isUsageBasedSubscriptionUseCase.execute(
      new IsUsageBasedSubscriptionQuery(query.orgId),
    );
    if (isUsageBased) {
      this.logger.debug('Skipping fair-use quota for usage-based org', {
        orgId: query.orgId,
        quotaType: query.quotaType,
      });
      return;
    }

    const { limit, windowMs } = await this.limitResolver.resolve(
      query.quotaType,
    );

    this.logger.debug('Checking quota', {
      userId: query.userId,
      quotaType: query.quotaType,
      limit,
    });

    // Use checkAndIncrement which atomically checks limit BEFORE incrementing
    // This prevents counter inflation on rejected requests
    const { quota, exceeded } =
      await this.usageQuotaRepository.checkAndIncrement(
        query.userId,
        query.quotaType,
        windowMs,
        limit,
      );

    if (exceeded) {
      const retryAfterSeconds = Math.ceil(quota.getRemainingTime() / 1000);

      this.logger.warn('Quota exceeded', {
        userId: query.userId,
        quotaType: query.quotaType,
        count: quota.count,
        limit,
        retryAfterSeconds,
      });

      throw new QuotaExceededError(
        query.quotaType,
        limit,
        windowMs,
        retryAfterSeconds,
        { currentCount: quota.count },
      );
    }

    this.logger.debug('Quota check passed', {
      userId: query.userId,
      quotaType: query.quotaType,
      count: quota.count,
      limit,
      remaining: limit - quota.count,
    });
  }
}
