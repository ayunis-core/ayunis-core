import type { ApiKeyUsageDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type ApiKeyUsageStatus = 'active' | 'revoked' | 'expired';

export function getApiKeyStatus(
  apiKey: Pick<ApiKeyUsageDto, 'revokedAt' | 'expiresAt'>,
  now: Date,
): ApiKeyUsageStatus {
  if (apiKey.revokedAt !== null) return 'revoked';
  if (apiKey.expiresAt !== null && new Date(apiKey.expiresAt) <= now) {
    return 'expired';
  }
  return 'active';
}
