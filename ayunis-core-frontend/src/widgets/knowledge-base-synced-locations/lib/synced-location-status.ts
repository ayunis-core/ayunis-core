import {
  SyncedLocationProvider,
  SyncedLocationState,
  type SyncedLocationResponseDto,
} from '@ayunis/api-client/schemas';

export type SyncedLocationStatus =
  | { kind: 'no_longer_accessible' }
  | { kind: 'last_sync_failed'; lastSucceededAt: string | null }
  | { kind: 'paused'; until: string }
  | { kind: 'syncing' }
  | { kind: 'waiting' }
  | { kind: 'synced'; at: string };

export function syncedLocationStatus(
  location: SyncedLocationResponseDto,
): SyncedLocationStatus {
  const unreachable =
    location.state === SyncedLocationState.no_longer_accessible;
  // A connector location stays out of reach until access is granted again; a
  // website that did not answer is tried again on every sync.
  if (unreachable && location.provider !== SyncedLocationProvider.web)
    return { kind: 'no_longer_accessible' };
  if (location.pausedUntil)
    return { kind: 'paused', until: location.pausedUntil };
  if (location.syncingSince) return { kind: 'syncing' };
  if (unreachable)
    return { kind: 'last_sync_failed', lastSucceededAt: location.lastSyncedAt };
  if (!location.lastSyncedAt) return { kind: 'waiting' };
  return { kind: 'synced', at: location.lastSyncedAt };
}
