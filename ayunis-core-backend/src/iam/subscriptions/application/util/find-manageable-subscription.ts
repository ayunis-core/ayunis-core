import type { UUID } from 'crypto';
import type { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import {
  MultipleActiveSubscriptionsError,
  SubscriptionNotFoundError,
} from 'src/iam/subscriptions/application/subscription.errors';
import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { isActive } from './is-active';

/**
 * Resolves the subscription a super admin is managing: the newest record, which
 * is what the org view renders and what change/uncancel already act on. Picking
 * the *active* one instead makes every mutation fail on a subscription whose
 * startsAt is still in the future, even though the UI offers its controls.
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

  if (subscriptions.length === 0) {
    throw new SubscriptionNotFoundError(orgId);
  }

  if (subscriptions.filter(isActive).length > 1) {
    throw new MultipleActiveSubscriptionsError(orgId);
  }

  return subscriptions.reduce(
    (newest, subscription) =>
      subscription.createdAt > newest.createdAt ? subscription : newest,
    subscriptions[0],
  );
}
