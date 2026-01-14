import { UUID } from 'crypto';
import { UsageQuota } from '../../domain/usage-quota.entity';
import { QuotaType } from '../../domain/quota-type.enum';

export abstract class UsageQuotaRepositoryPort {
  /**
   * Atomically increment the quota counter and return the updated quota.
   * If no quota exists, creates one with count=1.
   * If the window has expired, resets it and sets count=1.
   */
  abstract incrementAndGet(
    userId: UUID,
    quotaType: QuotaType,
    windowDurationMs: number,
  ): Promise<UsageQuota>;
}
