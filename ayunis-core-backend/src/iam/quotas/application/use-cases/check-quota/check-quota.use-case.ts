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

    const quota = await this.usageQuotaRepository.incrementAndGet(
      query.userId,
      query.quotaType,
      windowMs,
    );

    if (quota.count > limit) {
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
