import type { UUID } from 'crypto';
import type { Subscription } from '../../domain/subscription.entity';
import type { SubscriptionBillingInfo } from '../../domain/subscription-billing-info.entity';

export interface UpdateSubscriptionStartDateParams {
  subscriptionId: UUID;
  startsAt: Date;
  renewalCycleAnchor?: Date;
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
}
