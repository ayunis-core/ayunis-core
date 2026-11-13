export class PaneRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`Request failed with status ${status}`);
    this.name = 'PaneRequestError';
  }
}

/**
 * All the mutator needs of the pane session: one authenticated request. Taking
 * the capability rather than the session keeps this module off `pane-session`,
 * which imports the generated client that imports this one.
 */
export interface PaneRequester {
  request(path: string, init?: RequestInit): Promise<Response>;
}

/**
 * The session the call runs on, passed per call rather than held here, so
 * nothing in this module outlives the pane that created it. Optional only
 * because the generated client spreads an optional `options` into the init;
 * every call the pane makes goes through `createPaneChatApi`, which sets it.
 */
export type PaneRequestInit = RequestInit & { session?: PaneRequester };

/** Mutator for the pane's generated client: bearer token, never cookies. */
export async function paneFetch<T>(
  url: string,
  init: PaneRequestInit,
): Promise<T> {
  const { session, ...request } = init;
  if (!session) throw new Error('A pane API call was made without a session');
  const response = await session.request(url, request);
  if (!response.ok) {
    throw new PaneRequestError(response.status, await response.text());
  }
  // 204 has no body, and the generated response type expects `data`.
  const data: unknown =
    response.status === 204 ? undefined : await response.json();
  return { data, status: response.status } as T;
}
