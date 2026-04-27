import type { ApiKey } from '../../../domain/api-key.entity';

export interface CreateApiKeyResult {
  apiKey: ApiKey;
  secret: string;
}
