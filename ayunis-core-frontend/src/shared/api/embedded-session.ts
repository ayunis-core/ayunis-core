import config from '@/shared/config';

/**
 * The Outlook pane's API access: a Bearer token held by the pane and never
 * a cookie, so a browser session of the same user cannot leak into the pane.
 */
export interface EmbeddedSession {
  accessToken(): Promise<string>;
  /** Refreshes the session unless another request already replaced `token`. */
  refreshRejected(token: string): Promise<void>;
  /** Calls an API path with the Bearer token, refreshing once on 401. */
  request(path: string, init?: RequestInit): Promise<Response>;
}

let embeddedSession: EmbeddedSession | null = null;

/** Only the pane entry sets this; the web app keeps its cookie session. */
export function setEmbeddedSession(session: EmbeddedSession | null): void {
  embeddedSession = session;
}

export function getEmbeddedSession(): EmbeddedSession | null {
  return embeddedSession;
}

/** For API calls the generated client can't make, such as streams. */
export function apiFetch(path: string, init: RequestInit): Promise<Response> {
  if (embeddedSession) return embeddedSession.request(path, init);
  return fetch(`${config.api.baseUrl}${path}`, {
    ...init,
    credentials: 'include',
  });
}
