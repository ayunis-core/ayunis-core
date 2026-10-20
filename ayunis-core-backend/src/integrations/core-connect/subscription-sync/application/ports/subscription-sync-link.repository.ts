import type { UUID } from 'crypto';

export interface SubscriptionSyncLink {
  orgId: UUID;
  ownerId: string;
}

export abstract class SubscriptionSyncLinkRepository {
  abstract findAll(ownerId?: string): Promise<SubscriptionSyncLink[]>;
  abstract findByOrgId(orgId: UUID): Promise<SubscriptionSyncLink | null>;
  abstract save(link: SubscriptionSyncLink): Promise<void>;
  abstract delete(orgId: UUID): Promise<void>;
}
