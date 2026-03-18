import type { UUID } from 'crypto';
import type { IpAllowlist } from '../../domain/ip-allowlist.entity';

export abstract class IpAllowlistRepository {
  abstract findByOrgId(orgId: UUID): Promise<IpAllowlist | null>;
  abstract upsert(entity: IpAllowlist): Promise<IpAllowlist>;
  abstract deleteByOrgId(orgId: UUID): Promise<void>;
}
