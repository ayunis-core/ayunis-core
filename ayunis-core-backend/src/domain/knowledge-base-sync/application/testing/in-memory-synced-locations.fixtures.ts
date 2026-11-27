import type { UUID } from 'crypto';
import type { SyncedFilesSummary } from 'src/domain/knowledge-base-sync/application/models/synced-files-summary';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import { SyncedFile } from 'src/domain/knowledge-base-sync/domain/synced-file.entity';
import { SyncedFileSkipReason } from 'src/domain/knowledge-base-sync/domain/synced-file-skip-reason.enum';
import { SyncedFileState } from 'src/domain/knowledge-base-sync/domain/synced-file-state.enum';
import { ConnectorSyncedLocation } from 'src/domain/knowledge-base-sync/domain/connector-synced-location.entity';
import type { NextSyncs } from 'src/domain/knowledge-base-sync/domain/sync-schedule';
import type { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';
import { SyncedLocationState } from 'src/domain/knowledge-base-sync/domain/synced-location-state.enum';

/** The locations and files of the sync engine, without a database. */
export class InMemorySyncedLocationsRepository extends SyncedLocationsRepository {
  readonly locations = new Map<UUID, SyncedLocation>();
  readonly files = new Map<UUID, SyncedFile>();

  create(location: SyncedLocation): Promise<boolean> {
    const duplicate = [...this.locations.values()].some(
      (existing) =>
        existing.knowledgeBaseId === location.knowledgeBaseId &&
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- one provider so far
        existing.provider === location.provider &&
        existing.location === location.location,
    );
    if (!duplicate) this.locations.set(location.id, location);
    return Promise.resolve(!duplicate);
  }

  findById(id: UUID): Promise<SyncedLocation | null> {
    return Promise.resolve(this.locations.get(id) ?? null);
  }

  findByKnowledgeBaseId(knowledgeBaseId: UUID): Promise<SyncedLocation[]> {
    return Promise.resolve(
      [...this.locations.values()]
        .filter((location) => location.knowledgeBaseId === knowledgeBaseId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    );
  }

  summarizeFiles(
    locationIds: UUID[],
    skippedLimit: number,
  ): Promise<Map<UUID, SyncedFilesSummary>> {
    const summaries = new Map<UUID, SyncedFilesSummary>();
    for (const locationId of locationIds) {
      const files = [...this.files.values()].filter(
        (file) => file.locationId === locationId,
      );
      if (files.length === 0) continue;
      const skipped = files
        .filter((file) => file.state === SyncedFileState.SKIPPED)
        .sort((a, b) => a.path.localeCompare(b.path));
      summaries.set(locationId, {
        documents: files.filter((file) => file.sourceId).length,
        failed: files.filter(
          (file) => file.sourceId && file.processingErrorCode,
        ).length,
        awaitingCapacity: files.filter(
          (file) => file.state === SyncedFileState.AWAITING_CAPACITY,
        ).length,
        skippedCount: skipped.length,
        skipped: skipped
          .slice(0, skippedLimit)
          .map(({ name, path, skipReason }) => ({
            name,
            path,
            reason: skipReason!,
          })),
      });
    }
    return Promise.resolve(summaries);
  }

  lockById(id: UUID): Promise<SyncedLocation | null> {
    return this.findById(id);
  }

  markNoLongerAccessible(id: UUID, lastSyncedAt: Date | null): Promise<void> {
    if (this.locations.get(id)?.lastSyncedAt === lastSyncedAt)
      this.update(id, { state: SyncedLocationState.NO_LONGER_ACCESSIBLE });
    return Promise.resolve();
  }

  recordSync(id: UUID, cursor: string, syncedAt: Date): Promise<void> {
    this.update(id, {
      cursor,
      lastSyncedAt: syncedAt,
      state: SyncedLocationState.ACTIVE,
    });
    return Promise.resolve();
  }

  recordSyncStarted(id: UUID, startedAt: Date): Promise<void> {
    const syncingSince = this.locations.get(id)?.syncingSince ?? startedAt;
    this.update(id, { syncingSince });
    return Promise.resolve();
  }

  recordSyncEnded(id: UUID, next: NextSyncs): Promise<void> {
    const location = this.locations.get(id);
    if (location)
      this.update(id, {
        syncingSince: null,
        nextSyncAt: next[location.provider],
      });
    return Promise.resolve();
  }

  pause(id: UUID, until: Date): Promise<void> {
    const pausedUntil = this.locations.get(id)?.pausedUntil;
    if (!pausedUntil || pausedUntil < until)
      this.update(id, { pausedUntil: until });
    return Promise.resolve();
  }

  claimDue(
    now: Date,
    next: Partial<NextSyncs>,
    limit: number,
  ): Promise<Pick<SyncedLocation, 'id' | 'orgId'>[]> {
    const due = [...this.locations.values()]
      .flatMap((location) => {
        const nextSyncAt = next[location.provider];
        return nextSyncAt &&
          location.nextSyncAt <= now &&
          !location.pausedAt(now)
          ? [{ location, nextSyncAt }]
          : [];
      })
      .sort(
        (a, b) =>
          a.location.nextSyncAt.getTime() - b.location.nextSyncAt.getTime(),
      )
      .slice(0, limit);
    for (const { location, nextSyncAt } of due)
      this.update(location.id, { nextSyncAt });
    return Promise.resolve(
      due.map(({ location: { id, orgId } }) => ({ id, orgId })),
    );
  }

  delete(id: UUID): Promise<void> {
    this.locations.delete(id);
    for (const file of this.files.values())
      if (file.locationId === id) this.files.delete(file.id);
    return Promise.resolve();
  }

  findFileSourceIds(locationId: UUID): Promise<UUID[]> {
    return Promise.resolve(
      [...this.files.values()].flatMap((file) =>
        file.locationId === locationId && file.sourceId ? [file.sourceId] : [],
      ),
    );
  }

  lockFiles(locationId: UUID): Promise<SyncedFile[]> {
    return Promise.resolve(
      [...this.files.values()]
        .filter((file) => file.locationId === locationId)
        .map((file) => new SyncedFile({ ...file })),
    );
  }

  findFileById(id: UUID): Promise<SyncedFile | null> {
    const file = this.files.get(id);
    return Promise.resolve(file ? new SyncedFile({ ...file }) : null);
  }

  findFilesToProcess(
    locationId: UUID,
    afterFileId: UUID | null,
    limit: number,
  ): Promise<SyncedFile[]> {
    return Promise.resolve(
      [...this.files.values()]
        .filter(
          (file) =>
            file.locationId === locationId &&
            file.needsProcessing() &&
            (afterFileId === null || file.id > afterFileId),
        )
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, limit)
        .map((file) => new SyncedFile({ ...file })),
    );
  }

  lockFile(id: UUID): Promise<SyncedFile | null> {
    return this.findFileById(id);
  }

  skipRemovedAfterFailure(sourceIds: UUID[]): Promise<void> {
    for (const file of this.files.values())
      if (
        file.lastSourceId &&
        sourceIds.includes(file.lastSourceId) &&
        file.sourceId === null &&
        file.state === SyncedFileState.IMPORTED &&
        file.documentVersion === file.version
      )
        file.skip(SyncedFileSkipReason.REMOVED_AFTER_FAILURE);
    return Promise.resolve();
  }

  saveFiles(files: SyncedFile[]): Promise<void> {
    for (const file of files) this.files.set(file.id, new SyncedFile(file));
    return Promise.resolve();
  }

  deleteFiles(fileIds: UUID[]): Promise<void> {
    for (const id of fileIds) this.files.delete(id);
    return Promise.resolve();
  }

  clearSources(sourceIds: UUID[]): void {
    for (const file of this.files.values())
      if (file.sourceId && sourceIds.includes(file.sourceId))
        file.sourceId = null;
  }

  private update(id: UUID, changes: Partial<SyncedLocation>): void {
    const location = this.locations.get(id);
    if (location) this.locations.set(id, withChanges(location, changes));
  }
}

/** A copy of the location with `changes`, of the same subclass. */
export function withChanges(
  location: SyncedLocation,
  changes: Partial<SyncedLocation>,
): SyncedLocation {
  if (location instanceof ConnectorSyncedLocation)
    return new ConnectorSyncedLocation({ ...location, ...changes });
  throw new Error(`Unknown synced location subtype for ${location.id}`);
}
