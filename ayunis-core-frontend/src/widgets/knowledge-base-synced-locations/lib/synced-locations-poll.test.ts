import { describe, expect, it } from 'vitest';
import type { SyncedLocationResponseDto } from '@ayunis/api-client/schemas';
import {
  IDLE_POLL_MS,
  SYNCING_POLL_MS,
  SYNC_REQUEST_WINDOW_MS,
  syncedLocationsPollInterval,
} from './synced-locations-poll';

const now = Date.parse('2026-11-19T10:00:00.000Z');

function aLocation(
  syncingSince: string | null = null,
): SyncedLocationResponseDto {
  return {
    id: 'b2c7f1de-0b6a-4d55-9a3e-5c1b2f0e7a11',
    provider: 'connector',
    product: 'microsoft_365',
    location: 'https://contoso.sharepoint.com/sites/bauamt',
    state: 'active',
    lastSyncedAt: '2026-11-19T09:00:00.000Z',
    syncingSince,
    pausedUntil: null,
    nextSyncAt: '2026-11-19T10:30:00.000Z',
    documentCount: 3,
    failedCount: 0,
    notSyncedLimitReachedCount: 0,
    skippedCount: 0,
    skippedFiles: [],
  };
}

describe('syncedLocationsPollInterval', () => {
  it('polls fast after a sync was requested, before the location shows it is syncing', () => {
    expect(syncedLocationsPollInterval([aLocation()], now - 2000, now)).toBe(
      SYNCING_POLL_MS,
    );
    expect(
      syncedLocationsPollInterval(
        [aLocation()],
        now - SYNC_REQUEST_WINDOW_MS,
        now,
      ),
    ).toBe(IDLE_POLL_MS);
  });

  it('polls fast while a location syncs, and keeps polling slowly between syncs', () => {
    expect(
      syncedLocationsPollInterval(
        [aLocation(), aLocation('2026-11-19T09:59:00.000Z')],
        null,
        now,
      ),
    ).toBe(SYNCING_POLL_MS);
    expect(syncedLocationsPollInterval([aLocation()], null, now)).toBe(
      IDLE_POLL_MS,
    );
  });

  it('does not poll a knowledge base without synced locations', () => {
    expect(syncedLocationsPollInterval([], now, now)).toBe(false);
  });
});
