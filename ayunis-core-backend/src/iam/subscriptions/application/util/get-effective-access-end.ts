import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { getCancellationAccessEnd } from './get-cancellation-access-end';

// Mirrored in SQL by the orgs module's org-lifecycle-sql.ts (super-admin
// lifecycle status); its integration spec fails if the two disagree.
export function getEffectiveAccessEnd(subscription: Subscription): Date | null {
  if (subscription.accessEndsAt) {
    return subscription.accessEndsAt;
  }
  if (subscription.cancelledAt) {
    return getCancellationAccessEnd(subscription, subscription.cancelledAt);
  }
  return null;
}
