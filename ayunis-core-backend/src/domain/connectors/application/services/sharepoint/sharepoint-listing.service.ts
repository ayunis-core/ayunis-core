import { Injectable } from '@nestjs/common';
import {
  ConnectorSyncOutcome,
  type ConnectorChanges,
} from 'src/domain/connectors/application/models/connector-sync-results';
import {
  DELTA_SELECT,
  type GraphDrive,
  type GraphDriveItem,
} from 'src/domain/connectors/application/models/microsoft-graph-resources';
import {
  type SharePointCursor,
  type SharePointDriveCursor,
  sharePointItemId,
} from 'src/domain/connectors/application/models/sharepoint-cursor';
import { MicrosoftGraphPort } from 'src/domain/connectors/application/ports/microsoft-graph.port';
import type { ConnectorItem } from 'src/domain/connectors/domain/sync/connector-item';
import {
  deltaAll,
  GraphStop,
  GraphStopReason,
  listAll,
  okOrStop,
} from './sharepoint-graph.helpers';

/** A drive to list: whole, or one folder of it. */
export interface SharePointDriveScope {
  driveId: string;
  folderId: string | null;
  prefix: string;
}

/** What a location lists: a site's libraries, one library or one folder. */
export interface SharePointScope {
  siteId: string | null;
  drives: SharePointDriveScope[];
}

const DOCUMENT_LIBRARY = 'documentLibrary';
/** Deeper than SharePoint's URL length allows; guards against a cycle. */
const MAX_FOLDER_DEPTH = 400;

/**
 * Lists a SharePoint location through delta queries, by drive: the drive's
 * root for a library, the folder for a folder (Graph lists it recursively).
 * Throws `GraphStop` when access is lost or Graph throttles.
 */
@Injectable()
export class SharePointListing {
  constructor(private readonly graph: MicrosoftGraphPort) {}

  /** A site's document libraries; lists and OneDrive are not synced. */
  async siteScope(
    accessToken: string,
    siteId: string,
  ): Promise<SharePointScope> {
    const drives = await listAll<GraphDrive>(
      this.graph,
      accessToken,
      `/sites/${siteId}/drives?$select=id,name,driveType`,
    );
    return {
      siteId,
      drives: drives
        .filter(
          (drive) => (drive.driveType ?? DOCUMENT_LIBRARY) === DOCUMENT_LIBRARY,
        )
        .map((drive) => ({
          driveId: drive.id,
          folderId: null,
          prefix: drive.name,
        })),
    };
  }

  /** Everything below the location. */
  async full(
    accessToken: string,
    scope: SharePointScope,
  ): Promise<ConnectorChanges> {
    const items: ConnectorItem[] = [];
    const drives: SharePointDriveCursor[] = [];
    for (const drive of scope.drives) {
      const rootId =
        drive.folderId ?? (await this.rootIdOf(accessToken, drive.driveId));
      const { entries, deltaLink } = await deltaAll(
        this.graph,
        accessToken,
        firstDeltaPath(drive),
      );
      const cursor = { ...drive, rootId, deltaLink, folders: {} };
      items.push(...applyEntries(cursor, entries, true).items);
      drives.push(cursor);
    }
    return changesOf({ v: 1, siteId: scope.siteId, drives }, items, [], true);
  }

  /**
   * The changes since the cursor. Starts over with everything when Graph
   * demands it (`410`), a known folder was renamed, moved or deleted (Graph
   * reports it without its files), or a site's libraries changed.
   */
  async changes(
    accessToken: string,
    cursor: SharePointCursor,
  ): Promise<ConnectorChanges> {
    const scope = scopeOf(cursor);
    if (cursor.siteId) {
      const current = await this.siteScope(accessToken, cursor.siteId);
      if (!sameDrives(current, scope)) return this.full(accessToken, current);
    }
    const listed = await this.listSince(accessToken, cursor).catch(
      (error: unknown) => {
        if (
          error instanceof GraphStop &&
          error.reason === GraphStopReason.RESYNC
        )
          return null;
        throw error;
      },
    );
    return listed ?? this.full(accessToken, scope);
  }

  /** `null` when a known folder changed. */
  private async listSince(
    accessToken: string,
    cursor: SharePointCursor,
  ): Promise<ConnectorChanges | null> {
    const items: ConnectorItem[] = [];
    const removed: string[] = [];
    const drives: SharePointDriveCursor[] = [];
    for (const drive of cursor.drives) {
      const { entries, deltaLink } = await deltaAll(
        this.graph,
        accessToken,
        drive.deltaLink,
      );
      const next = { ...drive, deltaLink, folders: { ...drive.folders } };
      const applied = applyEntries(next, entries, false);
      if (applied.folderChanged) return null;
      items.push(...applied.items);
      removed.push(...applied.removed);
      drives.push(next);
    }
    return changesOf({ ...cursor, drives }, items, removed, false);
  }

  private async rootIdOf(
    accessToken: string,
    driveId: string,
  ): Promise<string> {
    return okOrStop(
      await this.graph.get<GraphDriveItem>(
        accessToken,
        `/drives/${driveId}/root?$select=id`,
      ),
    ).id;
  }
}

function firstDeltaPath({ driveId, folderId }: SharePointDriveScope): string {
  const root = folderId ? `items/${folderId}` : 'root';
  return `/drives/${driveId}/${root}/delta?${DELTA_SELECT}`;
}

function scopeOf(cursor: SharePointCursor): SharePointScope {
  return {
    siteId: cursor.siteId,
    drives: cursor.drives.map(({ driveId, folderId, prefix }) => ({
      driveId,
      folderId,
      prefix,
    })),
  };
}

function sameDrives(a: SharePointScope, b: SharePointScope): boolean {
  const key = (scope: SharePointScope) =>
    JSON.stringify(
      scope.drives
        .map(({ driveId, prefix }) => [driveId, prefix])
        .sort(([x], [y]) => x.localeCompare(y)),
    );
  return key(a) === key(b);
}

function changesOf(
  cursor: SharePointCursor,
  items: ConnectorItem[],
  removedItemIds: string[],
  fullListing: boolean,
): ConnectorChanges {
  return {
    outcome: ConnectorSyncOutcome.CHANGES,
    items,
    removedItemIds,
    cursor: JSON.stringify(cursor),
    fullListing,
  };
}

/**
 * Applies a drive's delta entries to its folders and turns its files into
 * items. Deleted entries carry only their ID and whether they were a file
 * or a folder; deletions of IDs never listed are passed on all the same.
 */
function applyEntries(
  drive: SharePointDriveCursor,
  entries: GraphDriveItem[],
  full: boolean,
): AppliedEntries {
  const applied: AppliedEntries = {
    items: [],
    removed: [],
    folderChanged: false,
  };
  const files: GraphDriveItem[] = [];
  for (const entry of lastEntries(entries)) {
    if (entry.id === drive.rootId) continue;
    if (entry.deleted) applyDeletion(drive, entry, full, applied);
    else if (entry.folder)
      applied.folderChanged =
        recordFolder(drive, entry, full) || applied.folderChanged;
    else if (entry.file) files.push(entry);
  }
  for (const file of files) {
    const path = pathOf(drive, file);
    if (path) applied.items.push(itemOf(drive, file, path));
    // Moved out of the location.
    else if (!full)
      applied.removed.push(sharePointItemId(drive.driveId, file.id));
  }
  return applied;
}

/** Graph may list an item more than once; its last entry is current. */
function lastEntries(entries: GraphDriveItem[]): GraphDriveItem[] {
  return [...new Map(entries.map((entry) => [entry.id, entry])).values()];
}

interface AppliedEntries {
  items: ConnectorItem[];
  removed: string[];
  folderChanged: boolean;
}

function applyDeletion(
  drive: SharePointDriveCursor,
  entry: GraphDriveItem,
  full: boolean,
  applied: AppliedEntries,
): void {
  if (full) return;
  if (drive.folders[entry.id]) applied.folderChanged = true;
  else if (!entry.folder)
    applied.removed.push(sharePointItemId(drive.driveId, entry.id));
}

/** True when a folder listed before was renamed or moved. */
function recordFolder(
  drive: SharePointDriveCursor,
  entry: GraphDriveItem,
  full: boolean,
): boolean {
  const parentId = entry.parentReference?.id ?? '';
  const name = entry.name ?? '';
  const known = drive.folders[entry.id];
  drive.folders[entry.id] = [parentId, name];
  return (
    !full && known !== undefined && (known[0] !== parentId || known[1] !== name)
  );
}

/** Below the location, or `null` when the file is not below it. */
function pathOf(
  drive: SharePointDriveCursor,
  file: GraphDriveItem,
): string | null {
  const segments = [file.name ?? ''];
  let parentId = file.parentReference?.id;
  while (parentId !== drive.rootId) {
    const folder = parentId ? drive.folders[parentId] : undefined;
    if (!folder || segments.length > MAX_FOLDER_DEPTH) return null;
    segments.unshift(folder[1]);
    parentId = folder[0];
  }
  return [drive.prefix, ...segments].filter(Boolean).join('/');
}

function itemOf(
  drive: SharePointDriveCursor,
  file: GraphDriveItem,
  path: string,
): ConnectorItem {
  return {
    id: sharePointItemId(drive.driveId, file.id),
    path,
    name: file.name ?? '',
    // The content hash stays when an Office document is renamed or moved, so
    // that does not process it again.
    version: file.file?.hashes?.quickXorHash ?? file.cTag ?? file.eTag ?? '',
    size: file.size ?? 0,
  };
}
