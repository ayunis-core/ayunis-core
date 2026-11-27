import { describe, expect, it } from 'vitest';
import type { SyncedLocationResponseDto } from '@ayunis/api-client/schemas';
import { syncedLocationStatus } from './synced-location-status';

const lastSuccess = '2026-11-22T06:00:00.000Z';

function aLocation(
  overrides: Partial<SyncedLocationResponseDto>,
): SyncedLocationResponseDto {
  return {
    id: '5d0c3c1e-8f0b-4a8e-9d1f-2b7a6c4e9f10',
    provider: 'web',
    product: null,
    location: 'https://www.musterstadt.de/rathaus',
    state: 'no_longer_accessible',
    lastSyncedAt: lastSuccess,
    syncingSince: null,
    pausedUntil: null,
    nextSyncAt: '2026-11-24T06:00:00.000Z',
    documentCount: 12,
    failedCount: 0,
    notSyncedLimitReachedCount: 0,
    skippedCount: 0,
    skippedFiles: [],
    ...overrides,
  };
}

describe('syncedLocationStatus', () => {
  it('shows an unreachable website as a failed sync with its last success, not as lost access', () => {
    expect(syncedLocationStatus(aLocation({}))).toEqual({
      kind: 'last_sync_failed',
      lastSucceededAt: lastSuccess,
    });
    expect(syncedLocationStatus(aLocation({ lastSyncedAt: null }))).toEqual({
      kind: 'last_sync_failed',
      lastSucceededAt: null,
    });
  });

  it('shows the retry of an unreachable website while it runs', () => {
    expect(
      syncedLocationStatus(
        aLocation({ syncingSince: '2026-11-23T06:00:00.000Z' }),
      ),
    ).toEqual({ kind: 'syncing' });
  });

  it('keeps showing a connector location that lost access as no longer accessible', () => {
    expect(
      syncedLocationStatus(
        aLocation({
          provider: 'connector',
          product: 'microsoft_365',
          syncingSince: '2026-11-23T06:00:00.000Z',
        }),
      ),
    ).toEqual({ kind: 'no_longer_accessible' });
  });
});
