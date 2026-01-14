import { Injectable, Logger } from '@nestjs/common';
import { UsageQuotaRepositoryPort } from '../../ports/usage-quota.repository.port';
import { QuotaLimitResolverService } from '../../services/quota-limit-resolver.service';
import { CheckQuotaQuery } from './check-quota.query';
import { QuotaExceededError } from '../../quotas.errors';

@Injectable()
export class CheckQuotaUseCase {
  private readonly logger = new Logger(CheckQuotaUseCase.name);

  constructor(
    private readonly usageQuotaRepository: UsageQuotaRepositoryPort,
    private readonly limitResolver: QuotaLimitResolverService,
  ) {}

  async execute(query: CheckQuotaQuery): Promise<void> {
    const { limit, windowMs } = this.limitResolver.resolve(
      query.userId,
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

      throw new QuotaExceededError(query.quotaType, limit, retryAfterSeconds, {
        currentCount: quota.count,
      });
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
