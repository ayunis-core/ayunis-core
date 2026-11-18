import {
  getAuthenticationControllerMeUrl,
  getAuthenticationControllerRefreshUrl,
  getLogoutControllerLogoutUrl,
} from '@/outlook/api/generated/ayunisCoreAPI';
import config from '@/shared/config';
import type { EmbeddedSession } from '@/shared/api/embedded-session';
import type {
  MeResponseDto,
  SessionTokensResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

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

export interface PaneSession extends EmbeddedSession {
  /** Resumes a stored session; null when the pane has never signed in. */
  restore(): Promise<MeResponseDto | null>;
  signIn(tokens: SessionTokensResponseDto): Promise<MeResponseDto>;
  signOut(): Promise<void>;
}

/**
 * API access for the add-in pane: Bearer access token in memory, refresh
 * token in the body. Cookies are never sent, so a browser session of the
 * same user cannot leak into the pane.
 */
export function createPaneSession(
  baseUrl: string = config.api.baseUrl,
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

  function store(tokens: SessionTokensResponseDto): void {
    accessToken = tokens.accessToken;
    refreshTokens.set(tokens.refreshToken);
  }

  function clear(): void {
    accessToken = null;
    refreshTokens.remove();
  }

  // Refresh tokens rotate: two concurrent refreshes would present the same
  // token twice, so every caller waits on the one in flight.
  let refreshing: Promise<void> | null = null;
  function refresh(): Promise<void> {
    refreshing ??= refreshOnce().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function refreshOnce(): Promise<void> {
    const refreshToken = refreshTokens.get();
    if (!refreshToken) throw new SessionExpiredError();
    const response = await post(getAuthenticationControllerRefreshUrl(), {
      refreshToken,
    });
    // Only a rejected token ends the session; a rate limit or a deploy gap
    // must not sign the user out.
    if (response.status === 401) {
      clear();
      throw new SessionExpiredError();
    }
    if (!response.ok) {
      throw new Error(`POST /auth/refresh failed: ${response.status}`);
    }
    store((await response.json()) as SessionTokensResponseDto);
  }

  async function currentAccessToken(): Promise<string> {
    if (!accessToken) await refresh();
    if (!accessToken) throw new SessionExpiredError();
    return accessToken;
  }

  /** Refreshes unless another request already replaced the rejected token. */
  async function refreshRejected(rejected: string): Promise<void> {
    if (accessToken === rejected) await refresh();
  }

  async function authorizedRequest(
    path: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const send = async () => {
      const token = await currentAccessToken();
      // Headers, not a spread: a caller's `Headers` instance has no own
      // enumerable properties, so spreading it would drop every header.
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${token}`);
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        credentials: 'omit',
        headers,
      });
      return { response, token };
    };
    const first = await send();
    let response = first.response;
    if (response.status === 401) {
      await refreshRejected(first.token);
      response = (await send()).response;
    }
    if (response.status === 401) {
      clear();
      throw new SessionExpiredError();
    }
    return response;
  }

  async function authorizedGet(path: string): Promise<Response> {
    const response = await authorizedRequest(path);
    if (!response.ok) throw new Error(`GET ${path} failed: ${response.status}`);
    return response;
  }

  const currentUser = async () =>
    (await (
      await authorizedGet(getAuthenticationControllerMeUrl())
    ).json()) as MeResponseDto;

  return {
    async restore() {
      if (!refreshTokens.get()) return null;
      await refresh();
      return currentUser();
    },
    async signIn(tokens) {
      store(tokens);
      return currentUser();
    },
    async signOut() {
      const refreshToken = refreshTokens.get();
      try {
        if (refreshToken)
          await post(getLogoutControllerLogoutUrl(), { refreshToken });
      } finally {
        clear();
      }
    },
    request: authorizedRequest,
    accessToken: currentAccessToken,
    refreshRejected,
  };
}
