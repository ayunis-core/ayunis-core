import type { UUID } from 'crypto';
import type { Branding } from '../../domain/branding.entity';

export abstract class BrandingRepository {
  abstract findByOrgId(orgId: UUID): Promise<Branding | null>;
  abstract upsert(branding: Branding): Promise<Branding>;
}
