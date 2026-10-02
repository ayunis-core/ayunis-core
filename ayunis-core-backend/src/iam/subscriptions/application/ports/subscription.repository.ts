import type { UUID } from 'crypto';
import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import type { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import type { OldSubscriptionDisposition } from 'src/iam/subscriptions/domain/value-objects/old-subscription-disposition.enum';

export interface UpdateSubscriptionStartDateParams {
  subscriptionId: UUID;
  startsAt: Date;
  renewalCycleAnchor?: Date;
}

export interface ReplaceSubscriptionParams {
  oldSubscriptionId: UUID;
  disposition: OldSubscriptionDisposition;
  oldAccessEndsAt: Date | null;
  oldCancelledAt: Date | null;
  newSubscription: Subscription;
}

export interface ApplyAccessEndAdjustmentsParams {
  orgId: UUID;
  requestingUserId: UUID;
  reason: string;
  adjustments: Array<{
    subscription: Subscription;
    previousAccessEndsAt: Date | null;
  }>;
}

export abstract class SubscriptionRepository {
  abstract findByOrgId(orgId: UUID): Promise<Subscription[]>;
  abstract findLatestByOrgId(orgId: UUID): Promise<Subscription | null>;
  abstract findAll(): Promise<Subscription[]>;
  /**
   * Distinct ids of orgs holding an active usage-based subscription. Filters
   * at the query level; must mirror `isActive` for the usage-based type
   * (started and before the explicit access end; legacy cancellations end
   * access immediately).
   */
  abstract findActiveUsageBasedOrgIds(now: Date): Promise<UUID[]>;
  abstract create(subscription: Subscription): Promise<Subscription>;
  abstract update(subscription: Subscription): Promise<Subscription>;
  abstract updateStartDate(
    params: UpdateSubscriptionStartDateParams,
  ): Promise<Subscription>;
  abstract updateBillingInfo(
    subscriptionId: UUID,
    billingInfo: SubscriptionBillingInfo,
  ): Promise<SubscriptionBillingInfo>;
  abstract delete(id: UUID): Promise<void>;
  /**
   * Atomically end the current subscription (cancel or delete, per the
   * disposition) and create the new one in a single transaction, so the org is
   * never left without a subscription or with two active subscriptions.
   */
  abstract replace(params: ReplaceSubscriptionParams): Promise<Subscription>;
  abstract applyAccessEndAdjustments(
    params: ApplyAccessEndAdjustmentsParams,
  ): Promise<void>;
}
