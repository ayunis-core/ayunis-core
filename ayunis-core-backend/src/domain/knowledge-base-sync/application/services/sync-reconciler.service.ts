import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { ConnectorItem } from 'src/domain/connectors/domain/sync/connector-item';
import { SyncedFile } from 'src/domain/knowledge-base-sync/domain/synced-file.entity';
import { SyncedFileState } from 'src/domain/knowledge-base-sync/domain/synced-file-state.enum';
import type { SyncedFileSkipReason } from 'src/domain/knowledge-base-sync/domain/synced-file-skip-reason.enum';

export interface ListedChanges {
  items: ConnectorItem[];
  removedItemIds: string[];
  fullListing: boolean;
}

interface ItemChange {
  contentChanged: boolean;
  renamed: boolean;
  /** Renamed or moved. */
  relabelled: boolean;
  rejectedWhileWaiting: boolean;
}

/** What a listing changes; documents are created once capacity is known. */
export interface SyncPlan {
  /** New files and files with any changed field, to be written. */
  changed: Set<SyncedFile>;
  /** Files gone from the location. */
  removed: SyncedFile[];
  /** Documents of removed files and of files that can no longer be processed. */
  documentsToRemove: UUID[];
  renames: { sourceId: UUID; name: string }[];
  /** Renamed or moved without a new version. */
  relabelled: number;
  /** Files whose document holds an older version of their content. */
  contentChanged: SyncedFile[];
  /** Files that need a document, in the order they get the remaining room. */
  awaitingDocument: SyncedFile[];
  /** Every file still below the location after the sync. */
  files: SyncedFile[];
}

/**
 * The reconciliation rules: a listing against the files known so far. Items
 * are matched by ID, so renames and moves keep their document; deletions of
 * unknown IDs are ignored, as providers report deletions by ID only.
 */
@Injectable()
export class SyncReconciler {
  plan(
    locationId: UUID,
    files: SyncedFile[],
    changes: ListedChanges,
    rejections: Map<string, SyncedFileSkipReason>,
  ): SyncPlan {
    const known = new Map(files.map((file) => [file.externalId, file]));
    // A provider may list an item twice in one round; the last one counts.
    const listed = new Map(changes.items.map((item) => [item.id, item]));
    const plan: SyncPlan = {
      changed: new Set(),
      removed: [],
      documentsToRemove: [],
      renames: [],
      relabelled: 0,
      contentChanged: [],
      awaitingDocument: [],
      files: [],
    };
    for (const item of listed.values()) {
      const rejection = rejections.get(item.id) ?? null;
      const file = known.get(item.id);
      if (file) {
        this.applyItem(plan, file, item, rejection);
      } else {
        const created = this.newFile(locationId, item, rejection);
        known.set(item.id, created);
        plan.changed.add(created);
      }
    }
    for (const id of this.removedIds(known, listed, changes)) {
      const file = known.get(id);
      if (!file) continue;
      known.delete(id);
      plan.changed.delete(file);
      plan.removed.push(file);
      if (file.sourceId) plan.documentsToRemove.push(file.sourceId);
    }
    plan.files = [...known.values()];
    plan.awaitingDocument = plan.files
      .filter((file) => file.needsDocument())
      .sort((a, b) => a.path.localeCompare(b.path));
    return plan;
  }

  /** Gives the first files their new documents; the rest wait for room. */
  assignDocuments(plan: SyncPlan, sourceIds: UUID[]): void {
    plan.awaitingDocument.forEach((file, index) => {
      const sourceId = sourceIds.at(index);
      if (sourceId) {
        file.importAs(sourceId);
        plan.changed.add(file);
      } else if (file.state !== SyncedFileState.AWAITING_CAPACITY) {
        file.awaitCapacity();
        plan.changed.add(file);
      }
    });
  }

  private removedIds(
    known: Map<string, SyncedFile>,
    listed: Map<string, ConnectorItem>,
    changes: ListedChanges,
  ): string[] {
    const candidates = changes.fullListing
      ? [...known.keys()]
      : changes.removedItemIds;
    return candidates.filter((id) => !listed.has(id));
  }

  private newFile(
    locationId: UUID,
    item: ConnectorItem,
    rejection: SyncedFileSkipReason | null,
  ): SyncedFile {
    return new SyncedFile({
      locationId,
      externalId: item.id,
      name: item.name,
      path: item.path,
      version: item.version,
      size: item.size,
      state: rejection
        ? SyncedFileState.SKIPPED
        : SyncedFileState.AWAITING_CAPACITY,
      skipReason: rejection,
    });
  }

  private applyItem(
    plan: SyncPlan,
    file: SyncedFile,
    item: ConnectorItem,
    rejection: SyncedFileSkipReason | null,
  ): void {
    const change = this.changeOf(file, item, rejection);
    if (!change) return;
    plan.changed.add(file);
    file.name = item.name;
    file.path = item.path;
    file.size = item.size;
    if (change.contentChanged) {
      file.version = item.version;
      this.applyNewVersion(plan, file, rejection);
    } else {
      if (change.relabelled) plan.relabelled++;
      if (rejection && change.rejectedWhileWaiting) file.skip(rejection);
    }
    if (change.renamed && file.sourceId)
      plan.renames.push({ sourceId: file.sourceId, name: item.name });
  }

  private changeOf(
    file: SyncedFile,
    item: ConnectorItem,
    rejection: SyncedFileSkipReason | null,
  ): ItemChange | null {
    const renamed = file.name !== item.name;
    const change: ItemChange = {
      contentChanged: file.version !== item.version,
      renamed,
      relabelled: renamed || file.path !== item.path,
      // A file still waiting for a document is held to the current
      // rejection even without a new version; a skipped one is retried
      // only with one.
      rejectedWhileWaiting: rejection !== null && file.needsDocument(),
    };
    const changed =
      change.contentChanged ||
      change.relabelled ||
      change.rejectedWhileWaiting ||
      file.size !== item.size;
    return changed ? change : null;
  }

  private applyNewVersion(
    plan: SyncPlan,
    file: SyncedFile,
    rejection: SyncedFileSkipReason | null,
  ): void {
    if (rejection) {
      if (file.sourceId) plan.documentsToRemove.push(file.sourceId);
      file.skip(rejection);
    } else if (file.state === SyncedFileState.SKIPPED) {
      file.awaitCapacity();
    } else if (file.sourceId) {
      plan.contentChanged.push(file);
    }
  }
}
