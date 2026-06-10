import type { UUID } from 'crypto';
import type { AnonymizationWhitelistEntry } from '../../domain/anonymization-whitelist-entry.entity';

export abstract class AnonymizationWhitelistRepository {
  abstract findByOrgId(orgId: UUID): Promise<AnonymizationWhitelistEntry[]>;
  abstract replaceForOrg(
    orgId: UUID,
    entries: AnonymizationWhitelistEntry[],
  ): Promise<AnonymizationWhitelistEntry[]>;
}
