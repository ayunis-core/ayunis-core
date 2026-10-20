import type { UUID } from 'crypto';

export interface FynnOrgLink {
  orgId: UUID;
  customerId: string;
}

export abstract class FynnOrgLinkRepository {
  abstract findAll(customerId?: string): Promise<FynnOrgLink[]>;
  abstract findByOrgId(orgId: UUID): Promise<FynnOrgLink | null>;
  abstract save(link: FynnOrgLink): Promise<void>;
  abstract delete(orgId: UUID): Promise<void>;
}
