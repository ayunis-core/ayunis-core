/** Where a SharePoint location's listing goes on, per drive. */
export interface SharePointDriveCursor {
  driveId: string;
  /** The location's folder; `null` when it is the whole drive. */
  folderId: string | null;
  /** The drive's root or the location's folder: where paths start. */
  rootId: string;
  /** What paths in the drive start with: the library's name in a site. */
  prefix: string;
  deltaLink: string;
  /**
   * The folders below the root, as `[parentId, name]` by ID. Graph reports a
   * renamed or moved folder without its files, so their paths come from here.
   */
  folders: Partial<Record<string, [parentId: string, name: string]>>;
}

/** The opaque cursor of a SharePoint location, as the engine stores it. */
export interface SharePointCursor {
  v: 1;
  /** For a site, whose libraries are listed again on every sync. */
  siteId: string | null;
  drives: SharePointDriveCursor[];
}

/** `null` for anything else, which is then listed from scratch. */
export function parseSharePointCursor(
  raw: string | null,
): SharePointCursor | null {
  if (!raw) return null;
  try {
    const cursor = JSON.parse(raw) as Partial<SharePointCursor>;
    return cursor.v === 1 && Array.isArray(cursor.drives)
      ? (cursor as SharePointCursor)
      : null;
  } catch {
    return null;
  }
}

/** An item's ID towards the engine: unique across the drives of a site. */
export function sharePointItemId(driveId: string, itemId: string): string {
  return `${driveId}/${itemId}`;
}

export function parseSharePointItemId(
  id: string,
): { driveId: string; itemId: string } | null {
  const [driveId, itemId, ...rest] = id.split('/');
  return driveId && itemId && rest.length === 0 ? { driveId, itemId } : null;
}
