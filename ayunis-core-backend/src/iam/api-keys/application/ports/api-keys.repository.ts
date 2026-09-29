import type { UUID } from 'crypto';
import type { ApiKey } from 'src/iam/api-keys/domain/api-key.entity';

export interface ApiKeyMetadataChanges {
  name?: string;
  description?: string | null;
}

export abstract class ApiKeysRepository {
  abstract findById(id: UUID): Promise<ApiKey | null>;
  abstract findByOrgId(orgId: UUID): Promise<ApiKey[]>;
  abstract findByPrefix(prefix: string): Promise<ApiKey | null>;
  abstract create(apiKey: ApiKey): Promise<ApiKey>;
  abstract revoke(id: UUID): Promise<void>;
  /**
   * Applies the changes only while the key is active and belongs to the org.
   * Returns false when no row matched.
   */
  abstract updateMetadataIfActive(
    id: UUID,
    orgId: UUID,
    changes: ApiKeyMetadataChanges,
  ): Promise<boolean>;
}
