import type { ApiKey } from '@/pages/admin-settings/api-keys-settings/model/types';
import { getApiKeyStatus } from '@/shared/lib/api-key-status';

export function partitionApiKeys(
  apiKeys: ApiKey[],
  now: Date,
): { active: ApiKey[]; archived: ApiKey[] } {
  const active: ApiKey[] = [];
  const archived: ApiKey[] = [];
  for (const apiKey of apiKeys) {
    if (getApiKeyStatus(apiKey, now) === 'active') {
      active.push(apiKey);
    } else {
      archived.push(apiKey);
    }
  }
  return { active, archived };
}
