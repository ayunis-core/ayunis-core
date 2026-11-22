import { Injectable } from '@nestjs/common';
import type {
  GraphDrive,
  GraphDriveItem,
  GraphSite,
} from 'src/domain/connectors/providers/microsoft-365/application/models/microsoft-graph-resources';
import {
  SharePointLocationKind,
  type SharePointResolution,
  SharePointResolutionOutcome as Outcome,
} from 'src/domain/connectors/providers/microsoft-365/application/models/sharepoint-location';
import {
  MicrosoftGraphPort,
  type MicrosoftGraphResponse,
} from 'src/domain/connectors/providers/microsoft-365/application/ports/microsoft-graph.port';
import {
  folderGrant,
  siteGrant,
} from 'src/domain/connectors/providers/microsoft-365/domain/sharepoint-grant';
import {
  encodePathSegments,
  type SharePointUrl,
} from 'src/domain/connectors/providers/microsoft-365/domain/sharepoint-url';
import {
  GraphStop,
  GraphStopReason,
  listAll,
  okOrStop,
} from './sharepoint-graph.helpers';

const DOCUMENT_LIBRARY = 'documentLibrary';

/**
 * Resolves a SharePoint URL part by part, as `/shares` cannot: the site by
 * its path, the library among the site's drives by its URL (whose segment
 * is localized, e.g. `Freigegebene Dokumente`), then the folder by its path
 * in that drive. Throws `GraphStop` while Graph throttles.
 */
@Injectable()
export class SharePointLocationResolver {
  constructor(private readonly graph: MicrosoftGraphPort) {}

  async resolve(
    accessToken: string,
    url: SharePointUrl,
    clientId: string,
  ): Promise<SharePointResolution> {
    const site = await this.graph.get<GraphSite>(
      accessToken,
      `${sitePathOf(url)}?$select=id,displayName,webUrl`,
    );
    if (site.status === 'access_denied')
      return {
        outcome: Outcome.NOT_GRANTED,
        grant: siteGrant(url.host, url.sitePath, clientId),
      };
    // Graph answers 400 for a host of another tenant.
    if (site.status === 'not_found' || isBadRequest(site))
      return { outcome: Outcome.NOT_FOUND };
    const { id, displayName, webUrl } = okOrStop(site);
    if (url.path.length === 0)
      return found({
        kind: SharePointLocationKind.SITE,
        siteId: id,
        name: displayName ?? webUrl,
        webUrl,
      });
    return this.resolveInSite(accessToken, url, id, clientId).catch(
      (error: unknown) => {
        if (
          error instanceof GraphStop &&
          error.reason === GraphStopReason.ACCESS_LOST
        )
          return {
            outcome: Outcome.NOT_FOUND_OR_NOT_GRANTED,
            grant: siteGrant(url.host, url.sitePath, clientId),
          };
        throw error;
      },
    );
  }

  private async resolveInSite(
    accessToken: string,
    url: SharePointUrl,
    siteId: string,
    clientId: string,
  ): Promise<SharePointResolution> {
    const drives = await listAll<GraphDrive>(
      this.graph,
      accessToken,
      `/sites/${siteId}/drives?$select=id,name,webUrl,driveType`,
    );
    const match = libraryOf(drives, url);
    if (!match)
      return this.resolveInSubsite(accessToken, url, siteId, clientId);
    const { drive, folderPath } = match;
    if (folderPath.length === 0)
      return found({
        kind: SharePointLocationKind.LIBRARY,
        siteId,
        driveId: drive.id,
        name: drive.name,
        webUrl: drive.webUrl,
      });
    const folder = await this.itemAt(accessToken, drive.id, folderPath);
    if (folder.status === 'ok') {
      const { id, name, webUrl, folder: isFolder } = folder.body;
      if (!isFolder) return { outcome: Outcome.UNSUPPORTED_URL };
      return found({
        kind: SharePointLocationKind.FOLDER,
        siteId,
        driveId: drive.id,
        itemId: id,
        name: name ?? folderPath.at(-1)!,
        webUrl: webUrl ?? drive.webUrl,
      });
    }
    const grant = folderGrant(drive.id, folderPath, clientId);
    if (folder.status === 'access_denied')
      return { outcome: Outcome.NOT_GRANTED, grant };
    if (folder.status !== 'not_found') okOrStop(folder);
    return (await this.mayHide(accessToken, drive.id, folderPath))
      ? { outcome: Outcome.NOT_FOUND_OR_NOT_GRANTED, grant }
      : { outcome: Outcome.NOT_FOUND };
  }

  /**
   * A URL below none of the site's libraries may be in one of its subsites,
   * which the URL does not tell from a library.
   */
  private async resolveInSubsite(
    accessToken: string,
    url: SharePointUrl,
    siteId: string,
    clientId: string,
  ): Promise<SharePointResolution> {
    const subsites = await listAll<GraphSite>(
      this.graph,
      accessToken,
      `/sites/${siteId}/sites?$select=id,displayName,webUrl`,
    );
    const subsite = subsiteOf(subsites, url);
    if (!subsite)
      return {
        outcome: Outcome.NOT_FOUND_OR_NOT_GRANTED,
        grant: siteGrant(url.host, url.sitePath, clientId),
      };
    const path = url.path.slice(1);
    if (path.length === 0)
      return found({
        kind: SharePointLocationKind.SITE,
        siteId: subsite.id,
        name: subsite.displayName ?? subsite.webUrl,
        webUrl: subsite.webUrl,
      });
    return this.resolveInSite(
      accessToken,
      { ...url, sitePath: sitePathOfSubsite(url), path },
      subsite.id,
      clientId,
    );
  }

  /**
   * Whether the folder at `path` may exist but not be granted: in a site
   * granted only in parts, Graph answers 404 for both. The closest folder
   * above it that the app sees tells: SharePoint counts all of its children,
   * granted or not, so seeing fewer than it counts means some are hidden.
   */
  private async mayHide(
    accessToken: string,
    driveId: string,
    path: string[],
  ): Promise<boolean> {
    for (let depth = path.length - 1; depth >= 0; depth--) {
      const ancestor = await this.itemAt(
        accessToken,
        driveId,
        path.slice(0, depth),
      );
      if (ancestor.status === 'not_found') continue;
      if (ancestor.status === 'access_denied') return true;
      const { id, folder } = okOrStop(ancestor);
      const visible = await listAll<GraphDriveItem>(
        this.graph,
        accessToken,
        `/drives/${driveId}/items/${id}/children?$select=id&$top=999`,
      );
      return (folder?.childCount ?? Infinity) > visible.length;
    }
    return true;
  }

  private itemAt(
    accessToken: string,
    driveId: string,
    path: string[],
  ): Promise<MicrosoftGraphResponse<GraphDriveItem>> {
    const item = path.length ? `root:/${encodePathSegments(path)}` : 'root';
    return this.graph.get<GraphDriveItem>(
      accessToken,
      `/drives/${driveId}/${item}?$select=id,name,webUrl,folder`,
    );
  }
}

function found(
  target: Extract<SharePointResolution, { outcome: Outcome.FOUND }>['target'],
): SharePointResolution {
  return { outcome: Outcome.FOUND, target };
}

function sitePathOf({ host, sitePath }: SharePointUrl): string {
  return sitePath
    ? `/sites/${host}:/${encodePathSegments(sitePath.split('/'))}`
    : `/sites/${host}`;
}

function isBadRequest(response: MicrosoftGraphResponse<unknown>): boolean {
  return response.status === 'rejected' && response.httpStatus === 400;
}

/**
 * The document library whose URL the URL is in, the most specific one if
 * several match, and the folder path below it.
 */
function libraryOf(
  drives: GraphDrive[],
  url: SharePointUrl,
): { drive: GraphDrive; folderPath: string[] } | null {
  const site = url.sitePath.split('/').filter(Boolean);
  const segments = [...site, ...url.path].map((segment) =>
    segment.toLowerCase(),
  );
  let best: { drive: GraphDrive; folderPath: string[] } | null = null;
  let bestLength = 0;
  for (const drive of drives) {
    if (drive.driveType && drive.driveType !== DOCUMENT_LIBRARY) continue;
    const library = decodedPath(drive.webUrl);
    const contains =
      library.length > site.length &&
      library.length <= segments.length &&
      library.every((segment, index) => segment === segments[index]);
    if (contains && library.length > bestLength) {
      best = {
        drive,
        folderPath: url.path.slice(library.length - site.length),
      };
      bestLength = library.length;
    }
  }
  return best;
}

function decodedPath(webUrl: string): string[] {
  return new URL(webUrl).pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment).toLowerCase());
}

/** The subsite the URL's first segment below the site names. */
function subsiteOf(
  subsites: GraphSite[],
  url: SharePointUrl,
): GraphSite | null {
  const expected = sitePathOfSubsite(url)
    .split('/')
    .map((segment) => segment.toLowerCase());
  return (
    subsites.find((candidate) => {
      const segments = decodedPath(candidate.webUrl);
      return (
        segments.length === expected.length &&
        segments.every((segment, index) => segment === expected[index])
      );
    }) ?? null
  );
}

function sitePathOfSubsite({ sitePath, path }: SharePointUrl): string {
  return [sitePath, path[0]].filter(Boolean).join('/');
}
