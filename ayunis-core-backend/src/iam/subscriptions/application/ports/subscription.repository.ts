import type { UUID } from 'crypto';
import type { Subscription } from '../../domain/subscription.entity';
import type { SubscriptionBillingInfo } from '../../domain/subscription-billing-info.entity';

export abstract class SubscriptionRepository {
  abstract findByOrgId(orgId: UUID): Promise<Subscription[]>;
  abstract findAll(): Promise<Subscription[]>;
  abstract create(subscription: Subscription): Promise<Subscription>;
  abstract update(subscription: Subscription): Promise<Subscription>;
  abstract updateBillingInfo(
    subscriptionId: UUID,
    billingInfo: SubscriptionBillingInfo,
  ): Promise<SubscriptionBillingInfo>;
  abstract delete(id: UUID): Promise<void>;
}
