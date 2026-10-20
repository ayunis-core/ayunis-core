import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { getEffectiveAccessEnd } from './get-effective-access-end';

// Mirrored in SQL by the orgs module's org-lifecycle-sql.ts (super-admin
// lifecycle status); its integration spec fails if the two disagree.
export function isActive(subscription: Subscription): boolean {
  if (new Date() < subscription.startsAt) {
    return false;
  }

  const accessEndsAt = getEffectiveAccessEnd(subscription);
  return accessEndsAt === null || new Date() < accessEndsAt;
}
