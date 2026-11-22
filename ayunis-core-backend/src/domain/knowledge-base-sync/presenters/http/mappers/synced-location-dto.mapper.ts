import type {
  KnowledgeBaseSyncOverview,
  SyncedLocationOverview,
} from 'src/domain/knowledge-base-sync/application/models/knowledge-base-sync-overview';
import type {
  SyncedLocationListResponseDto,
  SyncedLocationResponseDto,
} from 'src/domain/knowledge-base-sync/presenters/http/dto/synced-location-response.dto';

export function toSyncedLocationListDto(
  overview: KnowledgeBaseSyncOverview,
  now = new Date(),
): SyncedLocationListResponseDto {
  return {
    data: overview.locations.map((location) =>
      toSyncedLocationDto(location, now),
    ),
    availableProducts: overview.availableProducts,
  };
}

export function toSyncedLocationDto(
  { location, product, files }: SyncedLocationOverview,
  now = new Date(),
): SyncedLocationResponseDto {
  return {
    id: location.id,
    provider: location.provider,
    product,
    location: location.location,
    state: location.state,
    lastSyncedAt: location.lastSyncedAt,
    syncingSince: location.syncingSince,
    pausedUntil: location.pausedAt(now),
    nextSyncAt: location.nextSyncAt,
    documentCount: files.documents,
    failedCount: files.failed,
    notSyncedLimitReachedCount: files.awaitingCapacity,
    skippedCount: files.skippedCount,
    skippedFiles: files.skipped,
  };
}
