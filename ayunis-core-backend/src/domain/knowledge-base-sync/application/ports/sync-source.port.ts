import type {
  SyncChangesResult,
  SyncItemContentResult,
} from 'src/domain/knowledge-base-sync/application/models/sync-source-results';
import type { SyncedFile } from 'src/domain/knowledge-base-sync/domain/synced-file.entity';
import type { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';

/** Lists and reads the files below the locations of one provider. */
export abstract class SyncSource<L extends SyncedLocation> {
  /** The changes below the location since its cursor. */
  abstract listChanges(location: L): Promise<SyncChangesResult>;

  /** The current content of a file the source listed. */
  abstract fetchItemContent(
    location: L,
    file: SyncedFile,
  ): Promise<SyncItemContentResult>;
}
