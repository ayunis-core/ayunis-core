import type {
  MicrosoftGraphPort,
  MicrosoftGraphResponse,
} from 'src/domain/connectors/providers/microsoft-365/application/ports/microsoft-graph.port';
import type {
  GraphDriveItem,
  GraphPage,
} from 'src/domain/connectors/providers/microsoft-365/application/models/microsoft-graph-resources';

export enum GraphStopReason {
  /** Not granted (any more), or the location is gone. */
  ACCESS_LOST = 'access_lost',
  THROTTLED = 'throttled',
  /** A delta query must start over. */
  RESYNC = 'resync',
}

/** Ends a SharePoint call early; the adapter turns it into its outcome. */
export class GraphStop extends Error {
  constructor(
    readonly reason: GraphStopReason,
    readonly retryAt?: Date,
  ) {
    super(`Microsoft Graph stop: ${reason}`);
  }
}

/** Thrown for a `4xx` Graph should not answer, e.g. a token it refused. */
export class GraphRequestRejectedError extends Error {
  constructor(
    readonly httpStatus: number,
    readonly code: string | null,
  ) {
    super(
      ['Microsoft Graph rejected the request:', httpStatus, code ?? '']
        .join(' ')
        .trim(),
    );
  }
}

export function okOrStop<T>(response: MicrosoftGraphResponse<T>): T {
  switch (response.status) {
    case 'ok':
      return response.body;
    case 'throttled':
      throw new GraphStop(GraphStopReason.THROTTLED, response.retryAt);
    case 'resync_required':
      throw new GraphStop(GraphStopReason.RESYNC);
    case 'access_denied':
    case 'not_found':
      throw new GraphStop(GraphStopReason.ACCESS_LOST);
    case 'rejected':
      throw new GraphRequestRejectedError(response.httpStatus, response.code);
  }
}

/** Every page of a collection. */
export async function listAll<T>(
  graph: MicrosoftGraphPort,
  accessToken: string,
  path: string,
): Promise<T[]> {
  const values: T[] = [];
  let link: string | undefined = path;
  while (link) {
    const page: GraphPage<T> = okOrStop(
      await graph.get<GraphPage<T>>(accessToken, link),
    );
    values.push(...page.value);
    link = page['@odata.nextLink'];
  }
  return values;
}

/** Every page of a delta query, and where the next one starts. */
export async function deltaAll(
  graph: MicrosoftGraphPort,
  accessToken: string,
  link: string,
): Promise<{ entries: GraphDriveItem[]; deltaLink: string }> {
  const entries: GraphDriveItem[] = [];
  let next: string | undefined = link;
  while (next) {
    const page: GraphPage<GraphDriveItem> = okOrStop(
      await graph.get<GraphPage<GraphDriveItem>>(accessToken, next),
    );
    entries.push(...page.value);
    const deltaLink = page['@odata.deltaLink'];
    if (deltaLink) return { entries, deltaLink };
    next = page['@odata.nextLink'];
  }
  throw new Error('Microsoft Graph ended a delta query without a delta link');
}
