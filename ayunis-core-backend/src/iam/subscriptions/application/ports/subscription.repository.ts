import type { UUID } from 'crypto';
import type { Subscription } from '../../domain/subscription.entity';
import type { SubscriptionBillingInfo } from '../../domain/subscription-billing-info.entity';
import type { OldSubscriptionDisposition } from '../../domain/value-objects/old-subscription-disposition.enum';

export interface UpdateSubscriptionStartDateParams {
  subscriptionId: UUID;
  startsAt: Date;
  renewalCycleAnchor?: Date;
}

export interface ReplaceSubscriptionParams {
  oldSubscriptionId: UUID;
  disposition: OldSubscriptionDisposition;
  newSubscription: Subscription;
}

export abstract class SubscriptionRepository {
  abstract findByOrgId(orgId: UUID): Promise<Subscription[]>;
  abstract findLatestByOrgId(orgId: UUID): Promise<Subscription | null>;
  abstract findAll(): Promise<Subscription[]>;
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
}
