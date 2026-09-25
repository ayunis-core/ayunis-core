import { describe, expect, it } from 'vitest';
import type { ApiKey } from '@/pages/admin-settings/api-keys-settings/model/types';
import { partitionApiKeys } from './partition-api-keys';

const now = new Date('2026-09-25T12:00:00.000Z');

function buildApiKey(overrides: Partial<ApiKey>): ApiKey {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Key',
    prefixPreview: 'ayk_live_abc...',
    expiresAt: null,
    revokedAt: null,
    createdByUserId: null,
    createdAt: '2026-08-30T10:00:00.000Z',
    ...overrides,
  };
}

describe('partitionApiKeys', () => {
  it('splits keys into active and archived while keeping their order', () => {
    const active = buildApiKey({ id: '00000000-0000-0000-0000-000000000001' });
    const revoked = buildApiKey({
      id: '00000000-0000-0000-0000-000000000002',
      revokedAt: '2026-09-01T10:00:00.000Z',
    });
    const expired = buildApiKey({
      id: '00000000-0000-0000-0000-000000000003',
      expiresAt: '2026-09-20T10:00:00.000Z',
    });

    expect(partitionApiKeys([revoked, active, expired], now)).toEqual({
      active: [active],
      archived: [revoked, expired],
    });
  });
});
