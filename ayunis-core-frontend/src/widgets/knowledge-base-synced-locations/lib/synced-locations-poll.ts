import type { SyncedLocationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export const SYNCING_POLL_MS = 3000;
/** Between syncs, so the hourly sync shows up while the page is open. */
export const IDLE_POLL_MS = 60_000;
/** A requested sync usually starts within seconds; until it shows, poll fast. */
export const SYNC_REQUEST_WINDOW_MS = 30_000;

/** `false` while there is nothing to sync, as react-query's `refetchInterval`. */
export function syncedLocationsPollInterval(
  locations: SyncedLocationResponseDto[],
  syncRequestedAt: number | null,
  now: number,
): number | false {
  const requested =
    syncRequestedAt !== null && now - syncRequestedAt < SYNC_REQUEST_WINDOW_MS;
  const syncing = locations.some(({ syncingSince }) => syncingSince !== null);
  const interval = requested || syncing ? SYNCING_POLL_MS : IDLE_POLL_MS;
  return locations.length > 0 && interval;
}

/** Changes whenever a sync may have added, changed or removed documents. */
export function syncedDocumentsSignature(
  locations: SyncedLocationResponseDto[],
): string {
  return locations
    .map((location) =>
      [
        location.id,
        location.syncingSince,
        location.lastSyncedAt,
        location.documentCount,
        location.failedCount,
      ].join(':'),
    )
    .join('|');
}
