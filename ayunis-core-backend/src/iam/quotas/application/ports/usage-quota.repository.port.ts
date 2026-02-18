import { UUID } from 'crypto';
import { UsageQuota } from '../../domain/usage-quota.entity';
import { QuotaType } from '../../domain/quota-type.enum';

export interface CheckAndIncrementResult {
  quota: UsageQuota;
  exceeded: boolean;
}

export abstract class UsageQuotaRepositoryPort {
  /**
   * Atomically increment the quota counter and return the updated quota.
   * If no quota exists, creates one with count=1.
   * If the window has expired, resets it and sets count=1.
   * @deprecated Use checkAndIncrement instead to avoid counter inflation on rejected requests
   */
  abstract incrementAndGet(
    userId: UUID,
    quotaType: QuotaType,
    windowDurationMs: number,
  ): Promise<UsageQuota>;

  /**
   * Atomically check quota limit and increment if under limit.
   * - If no quota exists, creates one with count=1 (uses upsert to handle race conditions)
   * - If the window has expired, resets it and sets count=1
   * - If count >= limit, returns { exceeded: true } WITHOUT incrementing
   * - If count < limit, increments and returns { exceeded: false }
   */
  abstract checkAndIncrement(
    userId: UUID,
    quotaType: QuotaType,
    windowDurationMs: number,
    limit: number,
  ): Promise<CheckAndIncrementResult>;
}
