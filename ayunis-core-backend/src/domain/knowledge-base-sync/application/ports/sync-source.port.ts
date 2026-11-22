import type {
  SyncChangesResult,
  SyncItemContentResult,
} from 'src/domain/knowledge-base-sync/application/models/sync-source-results';
import type { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';

/** Lists and reads the files below the locations of one provider. */
export abstract class SyncSource<L extends SyncedLocation> {
  /** The changes below the location since its cursor. */
  abstract listChanges(location: L): Promise<SyncChangesResult>;

  abstract fetchItemContent(
    location: L,
    itemId: string,
  ): Promise<SyncItemContentResult>;
}
