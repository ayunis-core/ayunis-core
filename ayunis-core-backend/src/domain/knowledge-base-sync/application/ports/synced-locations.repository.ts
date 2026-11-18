import type { UUID } from 'crypto';
import type { SyncedFile } from 'src/domain/knowledge-base-sync/domain/synced-file.entity';
import type { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';

export abstract class SyncedLocationsRepository {
  /** `false` when the knowledge base already syncs it through the connector. */
  abstract create(location: SyncedLocation): Promise<boolean>;

  abstract findById(id: UUID): Promise<SyncedLocation | null>;

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

  /** Removes the location with its files; their documents are the caller's. */
  abstract delete(id: UUID): Promise<void>;

  /** The documents of the location's files. */
  abstract findFileSourceIds(locationId: UUID): Promise<UUID[]>;

  /** Locks the location's files until the transaction ends. */
  abstract lockFiles(locationId: UUID): Promise<SyncedFile[]>;

  /** Inserts new files and overwrites existing ones. */
  abstract saveFiles(files: SyncedFile[]): Promise<void>;

  abstract deleteFiles(fileIds: UUID[]): Promise<void>;
}
