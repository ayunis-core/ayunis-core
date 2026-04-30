import { Injectable, Logger } from '@nestjs/common';
import { UsageQuotaRepositoryPort } from '../../ports/usage-quota.repository.port';
import { QuotaLimitResolverService } from '../../services/quota-limit-resolver.service';
import { CheckQuotaQuery } from './check-quota.query';
import type { PrincipalRef } from '../../../domain/principal-ref';
import { QuotaExceededError } from '../../quotas.errors';

@Injectable()
export class CheckQuotaUseCase {
  private readonly logger = new Logger(CheckQuotaUseCase.name);

  constructor(
    private readonly usageQuotaRepository: UsageQuotaRepositoryPort,
    private readonly limitResolver: QuotaLimitResolverService,
  ) {}

  async execute(query: CheckQuotaQuery): Promise<void> {
    const { limit, windowMs } = await this.limitResolver.resolve(
      query.quotaType,
    );

    const principalLog = principalLogFields(query.principal);

    this.logger.debug('Checking quota', {
      ...principalLog,
      quotaType: query.quotaType,
      limit,
    });

    const { quota, exceeded } =
      await this.usageQuotaRepository.checkAndIncrement(
        query.principal,
        query.quotaType,
        windowMs,
        limit,
      );

    if (exceeded) {
      const retryAfterSeconds = Math.ceil(quota.getRemainingTime() / 1000);

      this.logger.warn('Quota exceeded', {
        ...principalLog,
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
      ...principalLog,
      quotaType: query.quotaType,
      count: quota.count,
      limit,
      remaining: limit - quota.count,
    });
  }
}

function principalLogFields(principal: PrincipalRef): Record<string, string> {
  return principal.kind === 'user'
    ? { principalKind: 'user', userId: principal.userId }
    : { principalKind: 'apiKey', apiKeyId: principal.apiKeyId };
}
