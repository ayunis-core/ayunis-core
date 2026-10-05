import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { getEffectiveAccessEnd } from './get-effective-access-end';

export function isActive(subscription: Subscription): boolean {
  if (new Date() < subscription.startsAt) {
    return false;
  }

  const accessEndsAt = getEffectiveAccessEnd(subscription);
  return accessEndsAt === null || new Date() < accessEndsAt;
}
