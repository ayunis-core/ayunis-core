import type {
  MeResponseDto,
  SessionTokensResponseDto,
} from '@ayunis/api-client/schemas';
import {
  createApiTransport,
  type ApiTransport,
} from '@ayunis/api-client/transport';

export type OfficeAddinSessionEndReason = 'expired' | 'signedOut';

export interface OfficeAddinSession {
  readonly transport: ApiTransport;
  signOut(this: void): Promise<void>;
  restore(): Promise<MeResponseDto | null>;
  signIn(tokens: SessionTokensResponseDto): Promise<MeResponseDto>;
  onEnd(listener: (reason: OfficeAddinSessionEndReason) => void): () => void;
}

export type OfficeAddinSessionConfig = {
  baseUrl: string;
  refreshTokenKey: string;
};

type RefreshTokenStore = {
  get(): string | null;
  set(value: string): void;
  remove(): void;
};

export class OfficeAddinSessionExpiredError extends Error {
  readonly status = 401;

  constructor() {
    super('The Ayunis session has expired');
    this.name = 'OfficeAddinSessionExpiredError';
  }
}

export function createOfficeAddinSession(
  config: OfficeAddinSessionConfig,
): OfficeAddinSession {
  const manager = new OfficeAddinSessionManager(config);
  return {
    transport: manager.transport,
    restore: () => manager.restore(),
    signIn: (tokens) => manager.signIn(tokens),
    signOut: () => manager.signOut(),
    onEnd: (listener) => manager.onEnd(listener),
  };
}

class OfficeAddinSessionManager {
  readonly transport: ApiTransport;
  private accessToken: string | null = null;
  private readonly issuedTokens = new Set<string>();
  private readonly endListeners = new Set<
    (reason: OfficeAddinSessionEndReason) => void
  >();
  private readonly refreshTokens: RefreshTokenStore;
  private signInVersion = 0;
  private refreshing: Promise<void> | null = null;

  constructor(private readonly config: OfficeAddinSessionConfig) {
    this.refreshTokens = createRefreshTokenStore(config.refreshTokenKey);
    this.transport = createApiTransport({
      baseUrl: config.baseUrl,
      credentials: 'omit',
      authorization: {
        getHeader: async () => `Bearer ${await this.currentAccessToken()}`,
        refresh: (header) =>
          this.refreshRejected(header.replace(/^Bearer /, '')),
        onFetchUnauthorized: () => {
          throw this.expire();
        },
      },
    });
  }

  async restore(): Promise<MeResponseDto | null> {
    if (!this.refreshTokens.get()) return null;
    await this.refresh();
    return this.currentUser();
  }

  async signIn(tokens: SessionTokensResponseDto): Promise<MeResponseDto> {
    this.clear();
    this.store(tokens);
    return this.currentUser();
  }

  async signOut(): Promise<void> {
    const refreshToken = this.refreshTokens.get();
    this.end('signedOut');
    if (refreshToken) {
      await this.post('/auth/logout', { refreshToken });
    }
  }

  onEnd(listener: (reason: OfficeAddinSessionEndReason) => void): () => void {
    this.endListeners.add(listener);
    return () => this.endListeners.delete(listener);
  }

  private post(path: string, body: object): Promise<Response> {
    return fetch(`${this.config.baseUrl}${path}`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private store(tokens: SessionTokensResponseDto): void {
    this.accessToken = tokens.accessToken;
    this.issuedTokens.add(tokens.accessToken);
    this.refreshTokens.set(tokens.refreshToken);
  }

  private clear(): void {
    this.signInVersion += 1;
    this.refreshing = null;
    this.accessToken = null;
    this.issuedTokens.clear();
    this.refreshTokens.remove();
  }

  private end(reason: OfficeAddinSessionEndReason): void {
    const hadSession =
      this.accessToken !== null || this.refreshTokens.get() !== null;
    this.clear();
    if (hadSession) {
      this.endListeners.forEach((listener) => listener(reason));
    }
  }

  private expire(): OfficeAddinSessionExpiredError {
    this.end('expired');
    return new OfficeAddinSessionExpiredError();
  }

  private refresh(): Promise<void> {
    if (this.refreshing) return this.refreshing;
    const running = this.refreshOnce().finally(() => {
      if (this.refreshing === running) this.refreshing = null;
    });
    this.refreshing = running;
    return running;
  }

  private async refreshOnce(): Promise<void> {
    const refreshToken = this.refreshTokens.get();
    if (!refreshToken) throw this.expire();
    const startedIn = this.signInVersion;
    const response = await this.post('/auth/refresh', { refreshToken });
    if (this.signInVersion !== startedIn) {
      throw new OfficeAddinSessionExpiredError();
    }
    if (response.status === 401) throw this.expire();
    if (!response.ok) {
      throw new Error(`POST /auth/refresh failed: ${response.status}`);
    }
    this.store((await response.json()) as SessionTokensResponseDto);
  }

  private async currentAccessToken(): Promise<string> {
    if (!this.accessToken) await this.refresh();
    if (!this.accessToken) throw this.expire();
    return this.accessToken;
  }

  private async refreshRejected(rejected: string): Promise<void> {
    if (!this.issuedTokens.has(rejected)) {
      throw new OfficeAddinSessionExpiredError();
    }
    if (this.accessToken === rejected) await this.refresh();
  }

  private async currentUser(): Promise<MeResponseDto> {
    const response = await this.transport.fetch('/auth/me');
    if (!response.ok) {
      throw new Error(`GET /auth/me failed: ${response.status}`);
    }
    return (await response.json()) as MeResponseDto;
  }
}

function createRefreshTokenStore(key: string): RefreshTokenStore {
  let memory: string | null = null;
  return {
    get(): string | null {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return memory;
      }
    },
    set(value: string): void {
      memory = value;
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // The token remains available to this pane in memory.
      }
    },
    remove(): void {
      memory = null;
      try {
        window.localStorage.removeItem(key);
      } catch {
        // No persistent token is available to remove.
      }
    },
  };
}
