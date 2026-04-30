import type { UsageQuota } from '../../domain/usage-quota.entity';
import type { QuotaType } from '../../domain/quota-type.enum';
import type { PrincipalRef } from '../../domain/principal-ref';

export interface CheckAndIncrementResult {
  quota: UsageQuota;
  exceeded: boolean;
}

export abstract class UsageQuotaRepositoryPort {
  /**
   * Atomically check quota limit and increment if under limit.
   * - If no quota exists for the principal, creates one with count=1
   *   (uses partial-index-aware upsert to handle race conditions).
   * - If the window has expired, resets it and sets count=1.
   * - If count >= limit, returns { exceeded: true } WITHOUT incrementing.
   * - If count < limit, increments and returns { exceeded: false }.
   *
   * The principal selects which anchor column the row is keyed on. A
   * user-anchored quota and an api-key-anchored quota live in independent
   * buckets even when the same human created the api-key.
   */
  abstract checkAndIncrement(
    principal: PrincipalRef,
    quotaType: QuotaType,
    windowDurationMs: number,
    limit: number,
  ): Promise<CheckAndIncrementResult>;
}
