import type { UUID } from 'crypto';
import type { ApiKey } from '../../domain/api-key.entity';

export abstract class ApiKeysRepository {
  abstract findById(id: UUID): Promise<ApiKey | null>;
  abstract findByPrefix(prefix: string): Promise<ApiKey | null>;
  abstract findByOrgId(orgId: UUID): Promise<ApiKey[]>;
  abstract create(apiKey: ApiKey): Promise<ApiKey>;
  abstract revoke(id: UUID): Promise<void>;
}
