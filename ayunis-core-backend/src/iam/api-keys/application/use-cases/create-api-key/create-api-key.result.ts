import type { ApiKey } from 'src/iam/api-keys/domain/api-key.entity';

export interface CreateApiKeyResult {
  apiKey: ApiKey;
  secret: string;
}
