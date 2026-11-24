import { paneApiBaseUrl } from './config';
import {
  createApiTransport,
  type ApiTransport,
} from '@ayunis/api-client/transport';
import type {
  MeResponseDto,
  SessionTokensResponseDto,
} from '@ayunis/api-client/schemas';

// Outlook reloads the pane on every open, so the refresh token has to outlive
// the page. In the cross-site iframe this storage is partitioned per
// top-level site. It is also the source of truth between several open panes:
// each refresh reads the latest token, so no pane replays a rotated one.
const REFRESH_TOKEN_KEY = 'ayunis.outlook.refreshToken';

/**
 * A browser that blocks third-party storage throws on every localStorage
 * access inside the pane iframe. The token then lives in memory only, which
 * costs a sign-in dialog per pane open but keeps the pane usable.
 */
function createRefreshTokenStore() {
  let memory: string | null = null;
  return {
    get(): string | null {
      try {
        return window.localStorage.getItem(REFRESH_TOKEN_KEY);
      } catch {
        return memory;
      }
    },
    set(value: string): void {
      memory = value;
      try {
        window.localStorage.setItem(REFRESH_TOKEN_KEY, value);
      } catch {
        // kept in memory
      }
    },
    remove(): void {
      memory = null;
      try {
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      } catch {
        // nothing stored
      }
    },
  };
}

export class SessionExpiredError extends Error {
  // Like a 401: query retries treat a 4xx as final, and no retry can revive
  // an expired session.
  readonly status = 401;

  constructor() {
    super('The Ayunis session has expired');
    this.name = 'SessionExpiredError';
  }
}

export type SessionEndReason = 'expired' | 'signedOut';

export interface PaneSession {
  readonly transport: ApiTransport;
  signOut(this: void): Promise<void>;
  /** Resumes a stored session; null when the pane has never signed in. */
  restore(): Promise<MeResponseDto | null>;
  signIn(tokens: SessionTokensResponseDto): Promise<MeResponseDto>;
  /** Returns the unsubscribe function. */
  onEnd(listener: (reason: SessionEndReason) => void): () => void;
}

/**
 * API access for the add-in pane: Bearer access token in memory, refresh
 * token in the body. Cookies are never sent, so a browser session of the
 * same user cannot leak into the pane.
 */
export function createPaneSession(
  baseUrl: string = paneApiBaseUrl,
): PaneSession {
  let accessToken: string | null = null;
  const refreshTokens = createRefreshTokenStore();

  const post = (path: string, body: object) =>
    fetch(`${baseUrl}${path}`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  // The access tokens of the current sign-in. A request answered 401 after
  // the user signed out (and maybe into another account) carries a token from
  // an earlier sign-in, and must not be retried with the current one.
  const issuedTokens = new Set<string>();
  // Counts sign-ins and sign-outs: a refresh still running from an earlier
  // sign-in must neither store its tokens nor end the current session.
  let signInCount = 0;
  // Refresh tokens rotate: two concurrent refreshes would present the same
  // token twice, so every caller waits on the one in flight.
  let refreshing: Promise<void> | null = null;

  function store(tokens: SessionTokensResponseDto): void {
    accessToken = tokens.accessToken;
    issuedTokens.add(tokens.accessToken);
    refreshTokens.set(tokens.refreshToken);
  }

  function clear(): void {
    signInCount += 1;
    refreshing = null;
    accessToken = null;
    issuedTokens.clear();
    refreshTokens.remove();
  }

  const endListeners = new Set<(reason: SessionEndReason) => void>();
  // A session ends once: a request that fails after the user signed out (or
  // another pane did) must not report that ended session as expired.
  function end(reason: SessionEndReason): void {
    const hadSession = accessToken !== null || refreshTokens.get() !== null;
    clear();
    if (hadSession) endListeners.forEach((listener) => listener(reason));
  }

  // Every way the session can expire goes through here, so the pane always
  // learns of it and shows its sign-in.
  function expire(): SessionExpiredError {
    end('expired');
    return new SessionExpiredError();
  }

  function refresh(): Promise<void> {
    if (!refreshing) {
      const running = refreshOnce().finally(() => {
        if (refreshing === running) refreshing = null;
      });
      refreshing = running;
    }
    return refreshing;
  }

  async function refreshOnce(): Promise<void> {
    const refreshToken = refreshTokens.get();
    if (!refreshToken) throw expire();
    const startedIn = signInCount;
    const response = await post('/auth/refresh', {
      refreshToken,
    });
    if (signInCount !== startedIn) throw new SessionExpiredError();
    // Only a rejected token ends the session; a rate limit or a deploy gap
    // must not sign the user out.
    if (response.status === 401) throw expire();
    if (!response.ok) {
      throw new Error(`POST /auth/refresh failed: ${response.status}`);
    }
    store((await response.json()) as SessionTokensResponseDto);
  }

  async function currentAccessToken(): Promise<string> {
    if (!accessToken) await refresh();
    if (!accessToken) throw expire();
    return accessToken;
  }

  /** Refreshes unless another request already replaced the rejected token. */
  async function refreshRejected(rejected: string): Promise<void> {
    if (!issuedTokens.has(rejected)) throw new SessionExpiredError();
    if (accessToken === rejected) await refresh();
  }

  const transport = createApiTransport({
    baseUrl,
    credentials: 'omit',
    authorization: {
      getHeader: async () => `Bearer ${await currentAccessToken()}`,
      refresh: (header) => refreshRejected(header.replace(/^Bearer /, '')),
      onFetchUnauthorized: () => {
        throw expire();
      },
    },
  });

  async function authorizedGet(path: string): Promise<Response> {
    const response = await transport.fetch(path);
    if (!response.ok) throw new Error(`GET ${path} failed: ${response.status}`);
    return response;
  }

  const currentUser = async () =>
    (await (await authorizedGet('/auth/me')).json()) as MeResponseDto;

  return {
    async restore() {
      if (!refreshTokens.get()) return null;
      await refresh();
      return currentUser();
    },
    async signIn(tokens) {
      clear();
      store(tokens);
      return currentUser();
    },
    async signOut() {
      // End locally first: logout revokes the session at once, and a request
      // still running would otherwise refresh, fail and report an expiry.
      const refreshToken = refreshTokens.get();
      end('signedOut');
      if (refreshToken) {
        await post('/auth/logout', { refreshToken });
      }
    },
    onEnd(listener) {
      endListeners.add(listener);
      return () => endListeners.delete(listener);
    },
    transport,
  };
}
