import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import {
  ConnectorSyncOutcome,
  type ConnectorAccessLost,
  type ConnectorChangesResult,
  type ConnectorItemContentResult,
  type ConnectorThrottled,
} from 'src/domain/connectors/application/models/connector-sync-results';
import {
  parseSharePointCursor,
  parseSharePointItemId,
} from 'src/domain/connectors/application/models/sharepoint-cursor';
import {
  SharePointLocationKind,
  SharePointResolutionOutcome,
  type SharePointTarget,
} from 'src/domain/connectors/application/models/sharepoint-location';
import { ConnectorSyncAdapter } from 'src/domain/connectors/application/ports/connector-sync-adapter.port';
import {
  type MicrosoftGraphDownload,
  MicrosoftGraphPort,
} from 'src/domain/connectors/application/ports/microsoft-graph.port';
import type { Connector } from 'src/domain/connectors/domain/connector.entity';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import { readMicrosoft365Setup } from 'src/domain/connectors/domain/microsoft-365/microsoft-365-connection';
import {
  isProtectedOfficeFile,
  PROTECTED_FILE_HEAD_BYTES,
} from 'src/domain/connectors/domain/microsoft-365/protected-office-file';
import { parseSharePointUrl } from 'src/domain/connectors/domain/microsoft-365/sharepoint-url';
import { ConnectorItemUnprocessableReason } from 'src/domain/connectors/domain/sync/connector-item';
import { Microsoft365GraphTokensService } from 'src/domain/connectors/application/services/microsoft-365-graph-tokens.service';
import {
  GraphRequestRejectedError,
  GraphStop,
  GraphStopReason,
} from './sharepoint-graph.helpers';
import {
  SharePointListing,
  type SharePointScope,
} from './sharepoint-listing.service';
import { SharePointLocationResolver } from './sharepoint-location-resolver.service';

const ACCESS_LOST: ConnectorAccessLost = {
  outcome: ConnectorSyncOutcome.ACCESS_LOST,
};

/**
 * Syncs SharePoint locations of a Microsoft 365 connector with its app-only
 * Graph token (`Sites.Selected`). The location is the URL the user added; it
 * is resolved on the first listing, after which the cursor holds the IDs.
 * Tokens stay here: the engine gets listings and content only.
 */
@Injectable()
export class SharePointSyncAdapter extends ConnectorSyncAdapter {
  readonly product = ConnectorProduct.MICROSOFT_365;

  constructor(
    private readonly tokens: Microsoft365GraphTokensService,
    private readonly graph: MicrosoftGraphPort,
    private readonly resolver: SharePointLocationResolver,
    private readonly listing: SharePointListing,
  ) {
    super();
  }

  async listChanges(
    connector: Connector,
    location: string,
    cursor: string | null,
  ): Promise<ConnectorChangesResult> {
    return this.withToken(connector, async (accessToken) => {
      const previous = parseSharePointCursor(cursor);
      if (previous) return this.listing.changes(accessToken, previous);
      const scope = await this.scopeOf(connector, accessToken, location);
      return scope ? this.listing.full(accessToken, scope) : ACCESS_LOST;
    });
  }

  async fetchContent(
    connector: Connector,
    location: string,
    itemId: string,
  ): Promise<ConnectorItemContentResult> {
    const id = parseSharePointItemId(itemId);
    if (!id) return { outcome: ConnectorSyncOutcome.GONE };
    return this.withToken(connector, async (accessToken) => {
      const download = await this.graph.download(
        accessToken,
        `/drives/${id.driveId}/items/${id.itemId}/content`,
      );
      switch (download.status) {
        case 'ok':
          return contentOf(download);
        case 'not_found':
          return { outcome: ConnectorSyncOutcome.GONE };
        case 'access_denied':
          return this.itemAccessDenied(connector, accessToken, location);
        case 'throttled':
          return {
            outcome: ConnectorSyncOutcome.THROTTLED,
            retryAt: download.retryAt,
          };
        case 'rejected':
          throw new GraphRequestRejectedError(
            download.httpStatus,
            download.code,
          );
        case 'resync_required':
          throw new Error('Microsoft Graph answered a download with 410');
      }
    });
  }

  /**
   * Graph also refuses single files, e.g. one flagged as malware. Only when
   * the location itself is no longer reachable is access lost; otherwise the
   * file fails on its own, so one file cannot stop its whole location.
   */
  private async itemAccessDenied(
    connector: Connector,
    accessToken: string,
    location: string,
  ): Promise<ConnectorAccessLost> {
    if (!(await this.scopeOf(connector, accessToken, location)))
      return ACCESS_LOST;
    throw new GraphRequestRejectedError(403, null);
  }

  /** The location's scope, or `null` when it is not (any more) reachable. */
  private async scopeOf(
    connector: Connector,
    accessToken: string,
    location: string,
  ): Promise<SharePointScope | null> {
    const url = parseSharePointUrl(location);
    const setup = readMicrosoft365Setup(connector.setup);
    if (!url || !setup) return null;
    const resolution = await this.resolver.resolve(
      accessToken,
      url,
      setup.clientId,
    );
    if (resolution.outcome !== SharePointResolutionOutcome.FOUND) return null;
    return this.scopeOfTarget(accessToken, resolution.target);
  }

  private scopeOfTarget(
    accessToken: string,
    target: SharePointTarget,
  ): Promise<SharePointScope> | SharePointScope {
    switch (target.kind) {
      case SharePointLocationKind.SITE:
        return this.listing.siteScope(accessToken, target.siteId);
      case SharePointLocationKind.LIBRARY:
        return {
          siteId: null,
          drives: [{ driveId: target.driveId, folderId: null, prefix: '' }],
        };
      case SharePointLocationKind.FOLDER:
        return {
          siteId: null,
          drives: [
            { driveId: target.driveId, folderId: target.itemId, prefix: '' },
          ],
        };
    }
  }

  /**
   * Runs `work` with the connector's Graph token. A token Entra refuses, a
   * location Graph no longer grants or finds, and throttling become the
   * outcomes the engine knows.
   */
  private async withToken<T>(
    connector: Connector,
    work: (accessToken: string) => Promise<T>,
  ): Promise<T | ConnectorAccessLost | ConnectorThrottled> {
    try {
      return (
        (await this.tokens.withAccessToken(connector, work)) ?? ACCESS_LOST
      );
    } catch (error) {
      if (!(error instanceof GraphStop)) throw error;
      if (error.reason === GraphStopReason.THROTTLED)
        return {
          outcome: ConnectorSyncOutcome.THROTTLED,
          retryAt: error.retryAt!,
        };
      if (error.reason === GraphStopReason.ACCESS_LOST) return ACCESS_LOST;
      throw error;
    }
  }
}

/**
 * The content, unless its first bytes show an encrypted Office document,
 * which SharePoint hands an app without usage rights as it is.
 */
async function contentOf(
  download: Extract<MicrosoftGraphDownload, { status: 'ok' }>,
): Promise<ConnectorItemContentResult> {
  const chunks = download.content[
    Symbol.asyncIterator
  ]() as AsyncIterator<Uint8Array>;
  const head = await readHead(chunks, PROTECTED_FILE_HEAD_BYTES);
  if (isProtectedOfficeFile(download.contentType, head)) {
    download.content.destroy();
    return {
      outcome: ConnectorSyncOutcome.UNPROCESSABLE,
      reason: ConnectorItemUnprocessableReason.ENCRYPTED,
    };
  }
  const content = Readable.from(replay(head, chunks), { objectMode: false });
  content.once('close', () => download.content.destroy());
  return {
    outcome: ConnectorSyncOutcome.CONTENT,
    content,
    size: download.size,
  };
}

async function readHead(
  chunks: AsyncIterator<Uint8Array>,
  bytes: number,
): Promise<Buffer> {
  const head: Buffer[] = [];
  let length = 0;
  while (length < bytes) {
    const next = await chunks.next();
    if (next.done) break;
    head.push(Buffer.from(next.value));
    length += next.value.length;
  }
  return Buffer.concat(head);
}

/** The stream again, from its start. */
async function* replay(
  head: Buffer,
  chunks: AsyncIterator<Uint8Array>,
): AsyncGenerator<Buffer> {
  if (head.length > 0) yield head;
  for (let next = await chunks.next(); !next.done; next = await chunks.next())
    yield Buffer.from(next.value);
}
