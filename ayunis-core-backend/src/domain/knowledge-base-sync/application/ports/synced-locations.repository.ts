import type { UUID } from 'crypto';
import type { SyncedFilesSummary } from 'src/domain/knowledge-base-sync/application/models/synced-files-summary';
import type { SyncedFile } from 'src/domain/knowledge-base-sync/domain/synced-file.entity';
import type { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';

export abstract class SyncedLocationsRepository {
  /** `false` when the knowledge base already syncs it through the connector. */
  abstract create(location: SyncedLocation): Promise<boolean>;

  abstract findById(id: UUID): Promise<SyncedLocation | null>;

  /** The knowledge base's locations, in the order they were added. */
  abstract findByKnowledgeBaseId(
    knowledgeBaseId: UUID,
  ): Promise<SyncedLocation[]>;

  /**
   * What the files of each location amount to, with up to `skippedLimit`
   * of its skipped files; a location without files is missing.
   */
  abstract summarizeFiles(
    locationIds: UUID[],
    skippedLimit: number,
  ): Promise<Map<UUID, SyncedFilesSummary>>;

  /** Locks the location until the transaction ends; `null` once removed. */
  abstract lockById(id: UUID): Promise<SyncedLocation | null>;

  /**
   * Unless another sync recorded itself since `lastSyncedAt`, which makes
   * the lost access the caller saw outdated.
   */
  abstract markNoLongerAccessible(
    id: UUID,
    lastSyncedAt: Date | null,
  ): Promise<void>;

  /** Stores the new cursor and marks the location active again. */
  abstract recordSync(id: UUID, cursor: string, syncedAt: Date): Promise<void>;

  /** Marks the location as syncing since `startedAt`, unless it already is. */
  abstract recordSyncStarted(id: UUID, startedAt: Date): Promise<void>;

  /** Ends the location's sync; the next one is due at `nextSyncAt`. */
  abstract recordSyncEnded(id: UUID, nextSyncAt: Date): Promise<void>;

  /** Pauses syncing until `until`, unless it is paused longer already. */
  abstract pause(id: UUID, until: Date): Promise<void>;

  /**
   * Takes up to `limit` locations whose sync is due at `now` and that are not
   * paused, oldest due first, and moves their next sync to `next`, so a
   * concurrent call takes others.
   */
  abstract claimDue(
    now: Date,
    next: Date,
    limit: number,
  ): Promise<Pick<SyncedLocation, 'id' | 'orgId'>[]>;

  /** Removes the location with its files; their documents are the caller's. */
  abstract delete(id: UUID): Promise<void>;

  /** The documents of the location's files. */
  abstract findFileSourceIds(locationId: UUID): Promise<UUID[]>;

  /** Locks the location's files until the transaction ends. */
  abstract lockFiles(locationId: UUID): Promise<SyncedFile[]>;

  abstract findFileById(id: UUID): Promise<SyncedFile | null>;

  /**
   * Up to `limit` files of the location whose document is behind their
   * version, by ID, after `afterFileId`.
   */
  abstract findFilesToProcess(
    locationId: UUID,
    afterFileId: UUID | null,
    limit: number,
  ): Promise<SyncedFile[]>;

  /** Locks one file until the transaction ends; `null` once removed. */
  abstract lockFile(id: UUID): Promise<SyncedFile | null>;

  /**
   * Skips the files whose document, one of `sourceIds`, a user removed after
   * it failed at their current version, until their version changes. Runs in
   * the removal's transaction, after the document is gone.
   */
  abstract skipRemovedAfterFailure(sourceIds: UUID[]): Promise<void>;

  /** Inserts new files and overwrites existing ones. */
  abstract saveFiles(files: SyncedFile[]): Promise<void>;

  abstract deleteFiles(fileIds: UUID[]): Promise<void>;
}
