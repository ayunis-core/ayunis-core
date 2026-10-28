import { describe, expect, it } from 'vitest';
import { getApiKeyStatus } from './api-key-status';

const now = new Date('2026-09-25T12:00:00.000Z');

function buildApiKey(
  overrides: Partial<{ revokedAt: string | null; expiresAt: string | null }>,
) {
  return { revokedAt: null, expiresAt: null, ...overrides };
}

describe('getApiKeyStatus', () => {
  it('treats a key without revocation or expiry as active', () => {
    expect(getApiKeyStatus(buildApiKey({}), now)).toBe('active');
  });

  it('treats a key expiring in the future as active', () => {
    const apiKey = buildApiKey({ expiresAt: '2026-09-25T12:00:01.000Z' });

    expect(getApiKeyStatus(apiKey, now)).toBe('active');
  });

  it('treats a key expiring exactly now as expired', () => {
    const apiKey = buildApiKey({ expiresAt: now.toISOString() });

    expect(getApiKeyStatus(apiKey, now)).toBe('expired');
  });

  it('treats a revoked key as revoked', () => {
    const apiKey = buildApiKey({ revokedAt: '2026-09-01T10:00:00.000Z' });

    expect(getApiKeyStatus(apiKey, now)).toBe('revoked');
  });

  it('prefers revoked over expired when both apply', () => {
    const apiKey = buildApiKey({
      revokedAt: '2026-09-01T10:00:00.000Z',
      expiresAt: '2026-09-10T10:00:00.000Z',
    });

    expect(getApiKeyStatus(apiKey, now)).toBe('revoked');
  });
});
