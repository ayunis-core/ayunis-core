import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { setEmbeddedSession } from '@/shared/api/embedded-session';
import {
  axiosInstance,
  isRetryingThroughDeployGap,
  shouldRetryQuery,
} from './client';

function respondWith(statuses: number[]) {
  const calls: InternalAxiosRequestConfig[] = [];
  axiosInstance.defaults.adapter = (config) => {
    calls.push(config);
    const status = statuses[Math.min(calls.length - 1, statuses.length - 1)];
    const response = {
      data: 'ok',
      status,
      statusText: '',
      headers: {},
      config,
    };
    if (status >= 400) {
      return Promise.reject(
        new AxiosError('failed', undefined, config, undefined, response),
      );
    }
    return Promise.resolve(response);
  };
  return calls;
}

describe('deploy-gap retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries a GET through a gateway error until the backend is back', async () => {
    const calls = respondWith([502, 503, 504, 200]);

    const request = axiosInstance.get('/threads');
    await vi.runAllTimersAsync();

    await expect(request).resolves.toMatchObject({ data: 'ok' });
    expect(calls).toHaveLength(4);
  });

  it('gives up after covering roughly thirty seconds', async () => {
    const calls = respondWith([502]);

    const request = axiosInstance.get('/threads');
    const settled = expect(request).rejects.toMatchObject({ status: 502 });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(calls.length).toBeLessThan(7);
    await vi.runAllTimersAsync();

    await settled;
    expect(calls).toHaveLength(7);
  });

  it('does not retry writes, which may already have reached the backend', async () => {
    const calls = respondWith([502, 200]);

    const request = axiosInstance.post('/threads');
    const settled = expect(request).rejects.toMatchObject({ status: 502 });
    await vi.runAllTimersAsync();

    await settled;
    expect(calls).toHaveLength(1);
  });

  it.each([500, 404])(
    'does not retry a GET failing with %i',
    async (status) => {
      const calls = respondWith([status, 200]);

      const request = axiosInstance.get('/threads');
      const settled = expect(request).rejects.toMatchObject({ status });
      await vi.runAllTimersAsync();

      await settled;
      expect(calls).toHaveLength(1);
    },
  );

  it('reports a deploy-gap retry only while one is in flight', async () => {
    respondWith([502, 200]);
    expect(isRetryingThroughDeployGap()).toBe(false);

    const request = axiosInstance.get('/threads');
    await vi.advanceTimersByTimeAsync(0);
    expect(isRetryingThroughDeployGap()).toBe(true);
    await vi.runAllTimersAsync();

    await expect(request).resolves.toMatchObject({ data: 'ok' });
    expect(isRetryingThroughDeployGap()).toBe(false);
  });

  it('clears the deploy-gap retry once retries are exhausted', async () => {
    respondWith([502]);

    const request = axiosInstance.get('/threads');
    const settled = expect(request).rejects.toMatchObject({ status: 502 });
    await vi.runAllTimersAsync();

    await settled;
    expect(isRetryingThroughDeployGap()).toBe(false);
  });

  it('stops retrying once the request is aborted', async () => {
    const calls = respondWith([502, 200]);
    const controller = new AbortController();

    const request = axiosInstance.get('/threads', {
      signal: controller.signal,
    });
    const settled = expect(request).rejects.toMatchObject({ status: 502 });
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await vi.runAllTimersAsync();

    await settled;
    expect(calls).toHaveLength(1);
  });
});

describe('embedded session', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let token = 'access-1';
  const refreshRejected = vi.fn(async () => {
    token = 'access-2';
  });

  beforeEach(() => {
    token = 'access-1';
    vi.stubGlobal('fetch', fetchMock);
    setEmbeddedSession({
      accessToken: async () => token,
      refreshRejected,
      request: vi.fn(),
    });
  });

  afterEach(() => {
    setEmbeddedSession(null);
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    refreshRejected.mockClear();
  });

  function sentRequests(): Request[] {
    return fetchMock.mock.calls.map(([input]) => input as Request);
  }

  it('sends the pane token and no cookies, so a browser session cannot leak into the pane', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));

    await axiosInstance.get('/threads');

    const [request] = sentRequests();
    expect(request.credentials).toBe('omit');
    expect(request.headers.get('Authorization')).toBe('Bearer access-1');
  });

  it('refreshes a rejected pane token once and retries with the new one', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await axiosInstance.get('/threads');

    expect(refreshRejected).toHaveBeenCalledWith('access-1');
    expect(sentRequests()[1].headers.get('Authorization')).toBe(
      'Bearer access-2',
    );
  });

  it('gives up when the refreshed token is rejected too', async () => {
    fetchMock.mockImplementation(
      async () => new Response('{}', { status: 401 }),
    );

    await expect(axiosInstance.get('/threads')).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('web session', () => {
  it('keeps the cookie session and sends no Authorization header', async () => {
    const calls = respondWith([200]);

    await axiosInstance.get('/threads');

    expect(calls[0].withCredentials).toBe(true);
    expect(calls[0].headers.get('Authorization')).toBeUndefined();
  });
});

describe('shouldRetryQuery', () => {
  it.each([502, 503, 504, 404])('does not retry status %i', (status) => {
    expect(shouldRetryQuery(0, { status })).toBe(false);
  });

  it('retries other failures up to three times', () => {
    expect(shouldRetryQuery(2, { status: 500 })).toBe(true);
    expect(shouldRetryQuery(3, { status: 500 })).toBe(false);
    expect(shouldRetryQuery(0, new Error('network'))).toBe(true);
  });
});
