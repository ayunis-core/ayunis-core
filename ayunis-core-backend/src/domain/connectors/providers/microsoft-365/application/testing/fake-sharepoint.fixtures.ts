import { createHash } from 'crypto';
import { Readable } from 'stream';
import type {
  GraphDriveItem,
  GraphPage,
} from 'src/domain/connectors/providers/microsoft-365/application/models/microsoft-graph-resources';
import {
  type MicrosoftGraphDownload,
  MicrosoftGraphPort,
  type MicrosoftGraphResponse,
} from 'src/domain/connectors/providers/microsoft-365/application/ports/microsoft-graph.port';

export const HOST = 'stadt-musterhausen.sharepoint.com';
export const DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const LINKS = 'https://graph.fake/delta';

interface FakeItem {
  id: string;
  name: string;
  parentId: string | null;
  folder: boolean;
  revision: number;
  content: Buffer;
  contentType: string;
  /** Not granted to the app, with everything below it. */
  hidden: boolean;
  /** Graph refuses its download, e.g. flagged as malware. */
  forbidden?: boolean;
}

export interface FakeSite {
  id: string;
  path: string;
  displayName: string;
  granted: boolean;
  drives: FakeDrive[];
}

export interface FakeDrive {
  id: string;
  name: string;
  webUrl: string;
  rootId: string;
  site: FakeSite;
  items: Map<string, FakeItem>;
  /** Item IDs in the order they changed; a delta token is its length. */
  log: { id: string; deleted?: { folder: boolean } }[];
}

/**
 * Microsoft Graph as a SharePoint tenant answers an app with `Sites.Selected`:
 * sites by path, their subsites and document libraries, items by path and ID, and delta
 * queries that report changes since a token like Graph does (a renamed
 * folder without its files, deletions by ID with the kind of item, `410`
 * once a folder moved out of a folder's scope).
 */
export class FakeSharePoint extends MicrosoftGraphPort {
  readonly sites: FakeSite[] = [];
  pageSize = 200;
  throttledUntil: Date | null = null;
  resyncDemanded = false;
  readonly requests: string[] = [];
  private ids = 0;

  site(path: string, displayName = path): FakeSite {
    const site = {
      id: `${HOST},site-${++this.ids}`,
      path,
      displayName,
      granted: true,
      drives: [],
    };
    this.sites.push(site);
    return site;
  }

  library(site: FakeSite, name: string, urlSegment = name): FakeDrive {
    const drive: FakeDrive = {
      id: `b!drive-${++this.ids}`,
      name,
      webUrl: `https://${HOST}/${site.path}/${encodeURIComponent(urlSegment)}`,
      rootId: `root-${++this.ids}`,
      site,
      items: new Map(),
      log: [],
    };
    site.drives.push(drive);
    return drive;
  }

  /** Creates the folders along `path`; returns the last one's ID. */
  folder(drive: FakeDrive, path: string, options: { hidden?: boolean } = {}) {
    let parentId = drive.rootId;
    for (const name of path.split('/')) {
      const existing = this.childNamed(drive, parentId, name);
      parentId =
        existing?.id ??
        this.create(drive, { name, parentId, folder: true, ...options });
    }
    return parentId;
  }

  file(
    drive: FakeDrive,
    path: string,
    options: { content?: Buffer; contentType?: string; hidden?: boolean } = {},
  ): string {
    const segments = path.split('/');
    const name = segments.pop()!;
    const parentId = segments.length
      ? this.folder(drive, segments.join('/'))
      : drive.rootId;
    return this.create(drive, { name, parentId, folder: false, ...options });
  }

  /** New content: a new `cTag`. */
  edit(drive: FakeDrive, id: string): void {
    const item = drive.items.get(id)!;
    item.revision++;
    item.content = Buffer.from(`${item.name} rev ${item.revision}`);
    drive.log.push({ id });
  }

  /** Like SharePoint for Office documents, a new `cTag` but the same hash. */
  rename(drive: FakeDrive, id: string, name: string): void {
    const item = drive.items.get(id)!;
    item.name = name;
    item.revision++;
    drive.log.push({ id });
  }

  move(drive: FakeDrive, id: string, parentId: string): void {
    const item = drive.items.get(id)!;
    item.parentId = parentId;
    item.revision++;
    drive.log.push({ id });
  }

  /** Deletes the item; Graph reports a folder's items deleted with it. */
  remove(drive: FakeDrive, id: string): void {
    for (const child of [...drive.items.values()])
      if (child.parentId === id) this.remove(drive, child.id);
    const item = drive.items.get(id)!;
    drive.items.delete(id);
    drive.log.push({ id, deleted: { folder: item.folder } });
  }

  get<T>(
    _accessToken: string,
    pathOrLink: string,
  ): Promise<MicrosoftGraphResponse<T>> {
    this.requests.push(pathOrLink);
    return Promise.resolve(
      this.answer(pathOrLink) as MicrosoftGraphResponse<T>,
    );
  }

  download(
    _accessToken: string,
    path: string,
  ): Promise<MicrosoftGraphDownload> {
    this.requests.push(path);
    return Promise.resolve(this.downloadOf(path));
  }

  private downloadOf(path: string): MicrosoftGraphDownload {
    if (this.throttledUntil)
      return { status: 'throttled', retryAt: this.throttledUntil };
    const [, driveId, itemId] =
      /^\/drives\/([^/]+)\/items\/([^/]+)\/content$/.exec(path)!;
    const drive = this.drive(driveId);
    if (!drive) return { status: 'not_found' };
    const item = drive.items.get(itemId);
    if (!drive.site.granted || item?.forbidden)
      return { status: 'access_denied' };
    if (!item || item.folder || !this.visible(drive, item))
      return { status: 'not_found' };
    return {
      status: 'ok',
      content: Readable.from([item.content]),
      size: item.content.length,
      contentType: item.contentType,
    };
  }

  private answer(pathOrLink: string): MicrosoftGraphResponse<unknown> {
    if (this.throttledUntil)
      return { status: 'throttled', retryAt: this.throttledUntil };
    if (pathOrLink.startsWith(LINKS))
      return this.deltaPage(new URL(pathOrLink).searchParams);
    const path = decodeURIComponent(pathOrLink.split('?')[0]);
    const routes: [
      RegExp,
      (match: string[]) => MicrosoftGraphResponse<unknown>,
    ][] = [
      [
        /^\/sites\/([^/:]+):\/(.+)$/,
        ([, host, site]) => this.siteAt(host, site),
      ],
      [/^\/sites\/([^/]+)\/drives$/, ([, site]) => this.drivesOf(site)],
      [/^\/sites\/([^/]+)\/sites$/, ([, site]) => this.subsitesOf(site)],
      [/^\/sites\/([^/]+)$/, ([, host]) => this.siteAt(host, '')],
      [
        /^\/drives\/([^/]+)\/(root|items\/[^/]+)\/delta$/,
        ([, drive, scope]) => this.deltaStart(drive, scope),
      ],
      [/^\/drives\/([^/]+)\/root$/, ([, drive]) => this.itemAt(drive, [])],
      [
        /^\/drives\/([^/]+)\/root:\/(.+)$/,
        ([, drive, itemPath]) => this.itemAt(drive, itemPath.split('/')),
      ],
      [
        /^\/drives\/([^/]+)\/items\/([^/]+)\/children$/,
        ([, drive, item]) => this.childrenOf(drive, item),
      ],
    ];
    for (const [pattern, route] of routes) {
      const match = pattern.exec(path);
      if (match) return route(match);
    }
    throw new Error(`Unexpected Graph request: ${pathOrLink}`);
  }

  private siteAt(host: string, path: string): MicrosoftGraphResponse<unknown> {
    if (host !== HOST)
      return { status: 'rejected', httpStatus: 400, code: 'invalidRequest' };
    const site = this.sites.find(
      (s) => s.path.toLowerCase() === path.toLowerCase(),
    );
    if (!site) return { status: 'not_found' };
    if (!site.granted) return { status: 'access_denied' };
    return ok({
      id: site.id,
      displayName: site.displayName,
      webUrl: `https://${HOST}/${site.path}`,
    });
  }

  private subsitesOf(siteId: string): MicrosoftGraphResponse<unknown> {
    const site = this.sites.find((s) => s.id === siteId);
    if (!site) return { status: 'not_found' };
    if (!site.granted) return { status: 'access_denied' };
    const depth = site.path.split('/').length + 1;
    return ok({
      value: this.sites
        .filter(
          (s) =>
            s.path.startsWith(`${site.path}/`) &&
            s.path.split('/').length === depth,
        )
        .map((s) => ({
          id: s.id,
          displayName: s.displayName,
          webUrl: `https://${HOST}/${s.path}`,
        })),
    });
  }

  private drivesOf(siteId: string): MicrosoftGraphResponse<unknown> {
    const site = this.sites.find((s) => s.id === siteId);
    if (!site) return { status: 'not_found' };
    if (!site.granted) return { status: 'access_denied' };
    return ok({
      value: site.drives.map(({ id, name, webUrl }) => ({
        id,
        name,
        webUrl,
        driveType: 'documentLibrary',
      })),
    });
  }

  private itemAt(
    driveId: string,
    path: string[],
  ): MicrosoftGraphResponse<unknown> {
    const drive = this.drive(driveId);
    if (!drive) return { status: 'not_found' };
    if (!drive.site.granted) return { status: 'access_denied' };
    let id = drive.rootId;
    for (const name of path) {
      const child = this.childNamed(drive, id, name);
      if (!child || !this.visible(drive, child)) return { status: 'not_found' };
      id = child.id;
    }
    return ok(this.resource(drive, id));
  }

  private childrenOf(
    driveId: string,
    id: string,
  ): MicrosoftGraphResponse<unknown> {
    const drive = this.drive(driveId)!;
    return ok({
      value: [...drive.items.values()]
        .filter((item) => item.parentId === id && this.visible(drive, item))
        .map((item) => this.resource(drive, item.id)),
    });
  }

  private deltaStart(
    driveId: string,
    scope: string,
  ): MicrosoftGraphResponse<unknown> {
    const drive = this.drive(driveId);
    if (!drive) return { status: 'not_found' };
    const scopeId =
      scope === 'root' ? drive.rootId : scope.slice('items/'.length);
    return this.deltaPage(
      new URLSearchParams({ drive: driveId, scope: scopeId, page: '0' }),
    );
  }

  private deltaPage(params: URLSearchParams): MicrosoftGraphResponse<unknown> {
    const drive = this.drive(params.get('drive')!);
    const scopeId = params.get('scope')!;
    if (!drive) return { status: 'not_found' };
    if (!drive.site.granted) return { status: 'access_denied' };
    if (scopeId !== drive.rootId && !drive.items.has(scopeId))
      return { status: 'not_found' };
    const since = params.get('since');
    const entries =
      since === null
        ? this.everything(drive, scopeId)
        : this.changes(drive, scopeId, Number(since));
    if (!entries) return { status: 'resync_required' };
    const page = Number(params.get('page'));
    const next = new URLSearchParams(params);
    const last = (page + 1) * this.pageSize >= entries.length;
    if (last) {
      next.set('since', String(drive.log.length));
      next.set('page', '0');
    } else next.set('page', String(page + 1));
    return ok<GraphPage<GraphDriveItem>>({
      value: entries.slice(page * this.pageSize, (page + 1) * this.pageSize),
      ...(last
        ? { '@odata.deltaLink': `${LINKS}?${next}` }
        : { '@odata.nextLink': `${LINKS}?${next}` }),
    });
  }

  private everything(drive: FakeDrive, scopeId: string): GraphDriveItem[] {
    return [
      this.resource(drive, scopeId),
      ...[...drive.items.values()]
        .filter(
          (item) =>
            this.visible(drive, item) && this.below(drive, item.id, scopeId),
        )
        .map((item) => this.resource(drive, item.id)),
    ];
  }

  /** `null` when Graph demands a resync. */
  private changes(
    drive: FakeDrive,
    scopeId: string,
    since: number,
  ): GraphDriveItem[] | null {
    if (this.resyncDemanded) {
      this.resyncDemanded = false;
      return null;
    }
    const latest = new Map(
      drive.log.slice(since).map((entry) => [entry.id, entry]),
    );
    const entries: GraphDriveItem[] = [this.resource(drive, scopeId)];
    for (const { id, deleted } of latest.values()) {
      if (deleted) {
        entries.push({
          id,
          deleted: {},
          ...(deleted.folder ? { folder: {} } : { file: {} }),
        });
        continue;
      }
      const item = drive.items.get(id)!;
      if (!this.visible(drive, item)) continue;
      if (this.below(drive, id, scopeId))
        entries.push(this.resource(drive, id));
      // Moved out of the folder the query is for.
      else if (scopeId !== drive.rootId) return null;
    }
    return entries;
  }

  private resource(drive: FakeDrive, id: string): GraphDriveItem {
    if (id === drive.rootId)
      return {
        id,
        name: 'root',
        root: {},
        folder: { childCount: this.childCount(drive, id) },
        webUrl: drive.webUrl,
      };
    const item = drive.items.get(id)!;
    const base = {
      id,
      name: item.name,
      parentReference: { id: item.parentId! },
      webUrl: `${drive.webUrl}/${item.name}`,
    };
    if (item.folder)
      return { ...base, folder: { childCount: this.childCount(drive, id) } };
    return {
      ...base,
      file: {
        mimeType: item.contentType,
        hashes: {
          quickXorHash: createHash('sha256')
            .update(item.content)
            .digest('base64'),
        },
      },
      cTag: `"c:{${id}},${item.revision}"`,
      eTag: `"{${id}},${item.revision}"`,
      size: item.content.length,
    };
  }

  /** SharePoint counts every child, also those the app does not see. */
  private childCount(drive: FakeDrive, id: string): number {
    return [...drive.items.values()].filter((item) => item.parentId === id)
      .length;
  }

  private below(drive: FakeDrive, id: string, scopeId: string): boolean {
    let parentId = drive.items.get(id)?.parentId ?? null;
    while (parentId && parentId !== scopeId)
      parentId = drive.items.get(parentId)?.parentId ?? null;
    return parentId === scopeId;
  }

  private visible(drive: FakeDrive, item: FakeItem): boolean {
    for (
      let current: FakeItem | undefined = item;
      current;
      current = drive.items.get(current.parentId ?? '')
    )
      if (current.hidden) return false;
    return true;
  }

  private childNamed(
    drive: FakeDrive,
    parentId: string,
    name: string,
  ): FakeItem | undefined {
    return [...drive.items.values()].find(
      (item) =>
        item.parentId === parentId &&
        item.name.toLowerCase() === name.toLowerCase(),
    );
  }

  private create(
    drive: FakeDrive,
    options: {
      name: string;
      parentId: string;
      folder: boolean;
      content?: Buffer;
      contentType?: string;
      hidden?: boolean;
    },
  ): string {
    const id = `item-${++this.ids}`;
    drive.items.set(id, {
      id,
      name: options.name,
      parentId: options.parentId,
      folder: options.folder,
      revision: 1,
      content: options.content ?? Buffer.from(`${options.name} rev 1`),
      contentType: options.contentType ?? 'application/pdf',
      hidden: options.hidden ?? false,
    });
    drive.log.push({ id });
    return id;
  }

  private drive(id: string): FakeDrive | undefined {
    return this.sites
      .flatMap((site) => site.drives)
      .find((drive) => drive.id === id);
  }
}

function ok<T>(body: T): MicrosoftGraphResponse<T> {
  return { status: 'ok', body };
}
