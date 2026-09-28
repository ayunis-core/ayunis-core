import type { ApiKey } from '@/pages/admin-settings/api-keys-settings/model/types';

export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

export function getApiKeyStatus(apiKey: ApiKey, now: Date): ApiKeyStatus {
  if (apiKey.revokedAt !== null) return 'revoked';
  if (apiKey.expiresAt !== null && new Date(apiKey.expiresAt) <= now) {
    return 'expired';
  }
  return 'active';
}

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
