import { isIP } from 'node:net';
import { fetch, Response } from 'undici';
import type * as Undici from 'undici';
import {
  OparlHostBlockedError,
  OparlRequestFailedError,
} from 'src/domain/oparl/application/oparl.errors';
import { OparlHttpClient } from './oparl-http.client';

jest.mock('undici', () => ({
  ...jest.requireActual<typeof Undici>('undici'),
  fetch: jest.fn(),
}));

const fetchMock = jest.mocked(fetch);

/* eslint-disable sonarjs/no-hardcoded-ip, sonarjs/no-clear-text-protocols -- These literals exercise SSRF address filtering. */

const PUBLIC = '193.17.243.10';
const SYSTEM_URL = 'https://ris.example.de/oparl/v1.1/system';
const SYSTEM = {
  id: SYSTEM_URL,
  type: 'https://schema.oparl.org/1.1/System',
  body: 'https://ris.example.de/oparl/v1.1/body',
};

class TestOparlHttpClient extends OparlHttpClient {
  readonly waits: number[] = [];

  constructor(private readonly addresses: Record<string, string[]>) {
    super();
  }

  protected override resolveAddresses(hostname: string): Promise<string[]> {
    return Promise.resolve(
      isIP(hostname) ? [hostname] : (this.addresses[hostname] ?? [PUBLIC]),
    );
  }

  protected override wait(ms: number): Promise<void> {
    // Instant, so the retries' delays can be asserted.
    this.waits.push(ms);
    return Promise.resolve();
  }
}

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  });

describe('OparlHttpClient', () => {
  beforeEach(() => fetchMock.mockReset());

  it('rejects a host that resolves to a private address before requesting it', async () => {
    const client = new TestOparlHttpClient({ 'ris.example.de': ['10.24.0.5'] });

    await expect(client.fetchObject(SYSTEM_URL)).rejects.toBeInstanceOf(
      OparlHostBlockedError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a redirect to a private address without following it', async () => {
    const client = new TestOparlHttpClient({
      'intern.example.de': ['192.168.1.20'],
    });
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'http://intern.example.de/oparl/system' },
      }),
    );

    await expect(client.fetchObject(SYSTEM_URL)).rejects.toBeInstanceOf(
      OparlHostBlockedError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects other schemes than http(s)', async () => {
    const client = new TestOparlHttpClient({});

    await expect(
      client.fetchObject('file:///etc/passwd'),
    ).rejects.toBeInstanceOf(OparlHostBlockedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('identifies itself and follows a redirect on a public host', async () => {
    const client = new TestOparlHttpClient({});
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, {
          status: 301,
          headers: { location: '/oparl/v1.1/system' },
        }),
      )
      .mockResolvedValueOnce(json(SYSTEM));

    await expect(
      client.fetchObject('http://ris.example.de/oparl'),
    ).resolves.toEqual(SYSTEM);
    const [url, init] = fetchMock.mock.calls[1];
    expect((url as URL).href).toBe('http://ris.example.de/oparl/v1.1/system');
    expect(init?.headers).toMatchObject({
      'user-agent': expect.stringContaining('Ayunis') as string,
    });
  });

  it('resolves a relative next link against the page it came from, after its redirect', async () => {
    const client = new TestOparlHttpClient({});
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, {
          status: 301,
          headers: {
            location: 'https://ris.example.de/oparl/v1.1/body/1/paper',
          },
        }),
      )
      .mockResolvedValueOnce(
        json({ data: [], links: { next: 'paper?page=2' } }),
      );

    await expect(
      client.fetchPage('https://ris.example.de/oparl/body/1/paper'),
    ).resolves.toMatchObject({
      nextUrl: 'https://ris.example.de/oparl/v1.1/body/1/paper?page=2',
    });
  });

  it("waits as long as a 429's Retry-After asks before trying again", async () => {
    const client = new TestOparlHttpClient({});
    fetchMock
      .mockResolvedValueOnce(
        new Response('slow down', {
          status: 429,
          headers: { 'retry-after': '7' },
        }),
      )
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(json({ data: [], links: {} }));

    await expect(
      client.fetchPage('https://ris.example.de/oparl/v1.1/body/1/paper'),
    ).resolves.toEqual({ data: [], nextUrl: null, totalElements: null });
    expect(client.waits).toEqual([7_000, 30_000]);
  });

  it('gives up after its retries', async () => {
    const client = new TestOparlHttpClient({});
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response('busy', { status: 503 })),
    );

    await expect(client.fetchObject(SYSTEM_URL)).rejects.toMatchObject({
      status: 503,
    });
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('does not retry a request the server rejects', async () => {
    const client = new TestOparlHttpClient({});
    fetchMock.mockResolvedValue(new Response('bad', { status: 400 }));

    const error = (await client
      .fetchPage(
        'https://ris.example.de/oparl/v1.1/body/1/paper?modified_since=x',
      )
      .catch((e: unknown) => e)) as OparlRequestFailedError;

    expect(error).toBeInstanceOf(OparlRequestFailedError);
    expect(error.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
