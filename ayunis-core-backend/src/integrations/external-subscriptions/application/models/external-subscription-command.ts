import type { UUID } from 'crypto';
import type { SubscriptionSyncData } from 'src/iam/subscriptions/application/models/subscription-sync-state';

export interface ExternalSubscriptionCommand {
  orgId: UUID;
  deliveryId?: string;
  revision: UUID;
  ownerId: string;
  subscription: SubscriptionSyncData | null;
  academyActive: boolean;
  revoke: boolean;
}
