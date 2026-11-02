import type { UUID } from 'crypto';
export abstract class SubscriptionSyncLease {
  abstract acquire(ownerId: UUID): Promise<boolean>;
  abstract release(ownerId: UUID): Promise<void>;
}
