import type { UUID } from 'crypto';

export interface ExternalSubscriptionLink {
  orgId: UUID;
  ownerId: string;
}

export abstract class ExternalSubscriptionLinkRepository {
  abstract findAll(ownerId?: string): Promise<ExternalSubscriptionLink[]>;
  abstract findByOrgId(orgId: UUID): Promise<ExternalSubscriptionLink | null>;
  abstract save(link: ExternalSubscriptionLink): Promise<void>;
  abstract delete(orgId: UUID): Promise<void>;
}
