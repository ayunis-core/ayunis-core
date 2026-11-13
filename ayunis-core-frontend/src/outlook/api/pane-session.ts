import config from '@/shared/config';
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
  constructor() {
    super('The Ayunis session has expired');
    this.name = 'SessionExpiredError';
  }
}

export interface PaneSession {
  /** Resumes a stored session; null when the pane has never signed in. */
  restore(): Promise<MeResponseDto | null>;
  signIn(tokens: SessionTokensResponseDto): Promise<MeResponseDto>;
  signOut(): Promise<void>;
  /**
   * Calls the API with the pane's Bearer token, refreshing it once on 401.
   * Any other status is returned for the caller to handle.
   */
  request(path: string, init?: RequestInit): Promise<Response>;
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

  async function refresh(): Promise<void> {
    const refreshToken = refreshTokens.get();
    if (!refreshToken) throw new SessionExpiredError();
    const response = await post('/auth/refresh', { refreshToken });
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

  async function authorizedRequest(
    path: string,
    init: RequestInit = {},
  ): Promise<Response> {
    if (!accessToken) await refresh();
    const send = () =>
      fetch(`${baseUrl}${path}`, {
        ...init,
        credentials: 'omit',
        headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
      });
    let response = await send();
    if (response.status === 401) {
      await refresh();
      response = await send();
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
    (await (await authorizedGet('/auth/me')).json()) as MeResponseDto;

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
        if (refreshToken) await post('/auth/logout', { refreshToken });
      } finally {
        clear();
      }
    },
    request: authorizedRequest,
  };
}
