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
    expect(retry[1]?.headers).toEqual({ Authorization: 'Bearer access-2' });
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-2');
  });

  it('forgets the stored session when the refresh token is rejected', async () => {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'revoked');
    fetchMock.mockResolvedValueOnce(json(401));

    await expect(createPaneSession('/api').restore()).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });

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
