export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

export function getApiKeyStatus(
  apiKey: { revokedAt: string | null; expiresAt: string | null },
  now: Date,
): ApiKeyStatus {
  if (apiKey.revokedAt !== null) return 'revoked';
  if (apiKey.expiresAt !== null && new Date(apiKey.expiresAt) <= now) {
    return 'expired';
  }
  return 'active';
}
