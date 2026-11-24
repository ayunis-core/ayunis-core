import {
  SyncedLocationState,
  type SyncedLocationResponseDto,
} from '@ayunis/api-client/schemas';

export type SyncedLocationStatus =
  | { kind: 'no_longer_accessible' }
  | { kind: 'paused'; until: string }
  | { kind: 'syncing' }
  | { kind: 'waiting' }
  | { kind: 'synced'; at: string };

export function syncedLocationStatus(
  location: SyncedLocationResponseDto,
): SyncedLocationStatus {
  if (location.state === SyncedLocationState.no_longer_accessible)
    return { kind: 'no_longer_accessible' };
  if (location.pausedUntil)
    return { kind: 'paused', until: location.pausedUntil };
  if (location.syncingSince) return { kind: 'syncing' };
  if (!location.lastSyncedAt) return { kind: 'waiting' };
  return { kind: 'synced', at: location.lastSyncedAt };
}
