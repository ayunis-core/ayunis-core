import type { UUID } from 'crypto';
import type { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import {
  MultipleActiveSubscriptionsError,
  SubscriptionNotFoundError,
} from 'src/iam/subscriptions/application/subscription.errors';
import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { getEffectiveAccessEnd } from './get-effective-access-end';
import { isActive } from './is-active';

/**
 * Resolves the newest subscription whose access period has not ended. This
 * keeps scheduled subscriptions manageable while preventing an ended recovery
 * record from receiving mutations instead of the subscription still serving.
 *
 * Organizations that already carry several serving subscriptions are still
 * refused rather than silently resolved to one of them (AYC-938).
 *
 * Only for super-admin-only mutations. Anything the org-admin invite flow can
 * reach (seat updates) must keep resolving the serving subscription instead.
 */
export async function findManageableSubscription(
  subscriptionRepository: SubscriptionRepository,
  orgId: UUID,
): Promise<Subscription> {
  const subscriptions = await subscriptionRepository.findByOrgId(orgId);
  return selectManageableSubscription(subscriptions, orgId);
}

export function selectManageableSubscription(
  subscriptions: Subscription[],
  orgId: UUID,
  allowEndedFallback = false,
): Subscription {
  if (subscriptions.filter(isActive).length > 1) {
    throw new MultipleActiveSubscriptionsError(orgId);
  }

  const current = selectCurrentSubscription(subscriptions);
  if (!current || (!allowEndedFallback && !hasOpenAccess(current))) {
    throw new SubscriptionNotFoundError(orgId);
  }
  return current;
}

/**
 * The record the super-admin view presents as the organization's current
 * subscription: the newest one whose access has not ended, falling back to
 * the newest record overall once every subscription has ended. Mutations and
 * the read model must agree on this choice, otherwise the UI offers controls
 * for one record while the use cases act on another.
 */
export function selectCurrentSubscription(
  subscriptions: Subscription[],
): Subscription | null {
  return newest(subscriptions.filter(hasOpenAccess)) ?? newest(subscriptions);
}

function hasOpenAccess(subscription: Subscription): boolean {
  const accessEndsAt = getEffectiveAccessEnd(subscription);
  return accessEndsAt === null || accessEndsAt > new Date();
}

function newest(subscriptions: Subscription[]): Subscription | null {
  return subscriptions.reduce<Subscription | null>(
    (latest, subscription) =>
      latest && latest.createdAt >= subscription.createdAt
        ? latest
        : subscription,
    null,
  );
}
