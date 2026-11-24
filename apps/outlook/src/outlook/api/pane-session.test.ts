import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPaneSession,
  SessionExpiredError,
} from '@/outlook/api/pane-session';

const REFRESH_TOKEN_KEY = 'ayunis.outlook.refreshToken';
const user = {
  id: 'user-1',
  name: 'Sachbearbeitung',
  email: 's@stadt.example',
};

function json(status: number, body: object = {}): Response {
  return new Response(JSON.stringify(body), { status });
}

function tokens(n: number) {
  return {
    accessToken: `access-${n}`,
    refreshToken: `refresh-${n}`,
    expiresIn: 3600,
  };
}

describe('createPaneSession', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('refreshes an expired access token once and keeps the user signed in', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401))
      .mockResolvedValueOnce(json(200, tokens(2)))
      .mockResolvedValueOnce(json(200, user));
    const session = createPaneSession('/api');

    await expect(session.signIn(tokens(1))).resolves.toEqual(user);

    const [, refresh, retry] = fetchMock.mock.calls;
    expect(refresh[1]?.body).toBe(
      JSON.stringify({ refreshToken: 'refresh-1' }),
    );
    expect(new Headers(retry[1]?.headers).get('Authorization')).toBe(
      'Bearer access-2',
    );
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-2');
  });

  it('keeps a caller header passed as a Headers instance', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, tokens(1)))
      .mockResolvedValueOnce(json(200, user))
      .mockResolvedValueOnce(json(200, {}));
    const session = createPaneSession('/api');
    await session.signIn(tokens(1));

    await session.transport.fetch('/threads', {
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });

    const sent = new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers);
    expect(sent.get('Content-Type')).toBe('application/json');
    expect(sent.get('Authorization')).toBe('Bearer access-1');
  });

  it('refreshes once for concurrent 401s, so the rotated token is never replayed', async () => {
    const session = createPaneSession('/api');
    fetchMock.mockResolvedValueOnce(json(200, user));
    await session.signIn(tokens(1));
    fetchMock.mockImplementation((_url, init) => {
      if (init?.body) return Promise.resolve(json(200, tokens(2)));
      const auth = new Headers(init?.headers).get('Authorization');
      return Promise.resolve(json(auth === 'Bearer access-2' ? 200 : 401));
    });

    const responses = await Promise.all([
      session.transport.fetch('/threads'),
      session.transport.fetch('/models/default-selection'),
    ]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    const refreshes = fetchMock.mock.calls.filter(([url]) =>
      (url as string).endsWith('/auth/refresh'),
    );
    expect(refreshes).toHaveLength(1);
  });

  it('forgets the stored session when the refresh token is rejected', async () => {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'revoked');
    fetchMock.mockResolvedValueOnce(json(401));

    await expect(createPaneSession('/api').restore()).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });

  // The embedded chat app can't navigate to a login page in the pane; the
  // pane entry shows its own sign-in when told the session ended.
  it('tells its listeners when the session ends and why', async () => {
    const ended = vi.fn();
    fetchMock.mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json(401));
    const session = createPaneSession('/api');
    session.onEnd(ended);

    await expect(session.signIn(tokens(1))).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
    expect(ended).toHaveBeenLastCalledWith('expired');

    fetchMock
      .mockResolvedValueOnce(json(200, user))
      .mockResolvedValueOnce(json(200));
    await session.signIn(tokens(2));
    await session.signOut();
    expect(ended).toHaveBeenLastCalledWith('signedOut');
    expect(ended).toHaveBeenCalledTimes(2);
  });

  // Panes share the stored token: one pane signing out removes it for all.
  it('ends the session when the stored token is gone at the next refresh', async () => {
    const ended = vi.fn();
    fetchMock
      .mockResolvedValueOnce(json(200, user))
      .mockResolvedValueOnce(json(401));
    const session = createPaneSession('/api');
    session.onEnd(ended);
    await session.signIn(tokens(1));

    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    await expect(session.transport.fetch('/threads')).rejects.toBeInstanceOf(
      SessionExpiredError,
    );

    expect(ended).toHaveBeenCalledWith('expired');
  });

  // Signing out from the history page can race the page's own request.
  it('reports no expiry for a request that fails after the user signed out', async () => {
    const ended = vi.fn();
    fetchMock.mockResolvedValueOnce(json(200, user));
    const session = createPaneSession('/api');
    session.onEnd(ended);
    await session.signIn(tokens(1));

    let answer: ((response: Response) => void) | undefined;
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    const inFlight = session.transport.fetch('/threads');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    fetchMock.mockResolvedValueOnce(json(200));
    await session.signOut();
    answer?.(json(401));

    await expect(inFlight).rejects.toBeInstanceOf(SessionExpiredError);
    expect(ended.mock.calls).toEqual([['signedOut']]);
  });

  // Logout revokes the session at once, so a request still running gets a
  // 401 and tries a refresh while the logout request is pending.
  it('reports only the sign-out when a request fails while signing out', async () => {
    const ended = vi.fn();
    fetchMock.mockResolvedValueOnce(json(200, user));
    const session = createPaneSession('/api');
    session.onEnd(ended);
    await session.signIn(tokens(1));

    let finishLogout: ((response: Response) => void) | undefined;
    fetchMock.mockImplementation((input) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.endsWith('/auth/logout')) {
        return new Promise((resolve) => {
          finishLogout = resolve;
        });
      }
      return Promise.resolve(json(401));
    });
    const signingOut = session.signOut();
    await expect(session.transport.fetch('/threads')).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
    finishLogout?.(json(200));
    await signingOut;

    expect(ended.mock.calls).toEqual([['signedOut']]);
  });

  // A request sent for one account must not be retried as the next one.
  it('does not retry a request from an earlier sign-in with the current account', async () => {
    fetchMock.mockResolvedValueOnce(json(200, user));
    const session = createPaneSession('/api');
    await session.signIn(tokens(1));

    let answer: ((response: Response) => void) | undefined;
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    const earlier = session.transport.fetch('/threads');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    fetchMock
      .mockResolvedValueOnce(json(200))
      .mockResolvedValueOnce(json(200, user));
    await session.signOut();
    await session.signIn(tokens(2));
    answer?.(json(401));

    await expect(earlier).rejects.toBeInstanceOf(SessionExpiredError);
    const retriedAs = fetchMock.mock.calls
      .filter(([url]) => (url as string).endsWith('/threads'))
      .map(([, init]) => new Headers(init?.headers).get('Authorization'));
    expect(retriedAs).toEqual(['Bearer access-1']);
  });

  it.each([
    ['succeeds', () => json(200, tokens(3))],
    ['is rejected', () => json(401)],
  ])(
    'keeps the next account signed in when a refresh of the earlier one %s afterwards',
    async (_outcome, refreshAnswer) => {
      let answerRefresh: ((response: Response) => void) | undefined;
      let rejectFirst = true;
      fetchMock.mockImplementation((url) => {
        const path = url as string;
        if (path.endsWith('/auth/refresh')) {
          return new Promise((resolve) => {
            answerRefresh = resolve;
          });
        }
        if (path.endsWith('/threads') && rejectFirst) {
          rejectFirst = false;
          return Promise.resolve(json(401));
        }
        return Promise.resolve(json(200, user));
      });
      const session = createPaneSession('/api');
      const ends: string[] = [];
      session.onEnd((reason) => ends.push(reason));
      await session.signIn(tokens(1));
      const earlier = session.transport.fetch('/threads');
      await vi.waitFor(() => expect(answerRefresh).toBeDefined());

      await session.signOut();
      await session.signIn(tokens(2));
      answerRefresh?.(refreshAnswer());
      await expect(earlier).rejects.toBeInstanceOf(SessionExpiredError);
      await session.transport.fetch('/threads');

      expect(ends).toEqual(['signedOut']);
      expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-2');
      const sentAs = new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers);
      expect(sentAs.get('Authorization')).toBe('Bearer access-2');
    },
  );

  it('keeps the stored session when the backend cannot be reached', async () => {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1');
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(createPaneSession('/api').restore()).rejects.toBeInstanceOf(
      TypeError,
    );
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-1');
  });

  it.each([429, 503])(
    'keeps the stored session when the refresh answers %i',
    async (status) => {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1');
      fetchMock.mockResolvedValueOnce(json(status));

      const restored = createPaneSession('/api').restore();

      await expect(restored).rejects.toThrow();
      await expect(restored).rejects.not.toBeInstanceOf(SessionExpiredError);
      expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-1');
    },
  );

  describe('when the browser blocks storage in the pane iframe', () => {
    const blocked = new DOMException('Access is denied', 'SecurityError');
    const realStorage = window.localStorage;

    beforeEach(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw blocked;
        },
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: realStorage,
      });
    });

    it('treats the pane as never signed in', async () => {
      await expect(createPaneSession('/api').restore()).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('signs in and refreshes from the token kept in memory', async () => {
      fetchMock
        .mockResolvedValueOnce(json(401))
        .mockResolvedValueOnce(json(200, tokens(2)))
        .mockResolvedValueOnce(json(200, user));

      await expect(
        createPaneSession('/api').signIn(tokens(1)),
      ).resolves.toEqual(user);

      const [, refresh] = fetchMock.mock.calls;
      expect(refresh[1]?.body).toBe(
        JSON.stringify({ refreshToken: 'refresh-1' }),
      );
    });

    it('signs out and revokes the token kept in memory', async () => {
      fetchMock
        .mockResolvedValueOnce(json(200, user))
        .mockResolvedValueOnce(json(200));
      const session = createPaneSession('/api');
      await session.signIn(tokens(1));

      await expect(session.signOut()).resolves.toBeUndefined();

      const [, logout] = fetchMock.mock.calls;
      expect(logout[0]).toBe('/api/auth/logout');
      expect(logout[1]?.body).toBe(
        JSON.stringify({ refreshToken: 'refresh-1' }),
      );
    });
  });
});
