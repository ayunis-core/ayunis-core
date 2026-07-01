import type { UUID } from 'crypto';
import type { ApiKey } from '../../domain/api-key.entity';

export abstract class ApiKeysRepository {
  abstract findById(id: UUID): Promise<ApiKey | null>;
  abstract findByOrgId(orgId: UUID): Promise<ApiKey[]>;
  abstract findByPrefix(prefix: string): Promise<ApiKey | null>;
  abstract create(apiKey: ApiKey): Promise<ApiKey>;
  abstract revoke(id: UUID): Promise<void>;
  /**
   * Counts API keys with a non-null `expiresAt` strictly before `cutoff`.
   * Used by the TTL purge dry-run to report the impact without deleting.
   */
  abstract countExpiredBefore(cutoff: Date): Promise<number>;
  /**
   * Hard-deletes API keys with a non-null `expiresAt` strictly before
   * `cutoff`. Keys without an expiry (`expiresAt IS NULL`) are never purged.
   * Returns the number of rows removed.
   */
  abstract deleteExpiredBefore(cutoff: Date): Promise<number>;
}
