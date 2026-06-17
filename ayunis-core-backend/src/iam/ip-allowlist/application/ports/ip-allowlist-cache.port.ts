import type { UUID } from 'crypto';

export abstract class IpAllowlistCachePort {
  abstract invalidateCache(orgId: UUID): void;
}
