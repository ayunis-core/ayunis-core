import type { ConfigService } from '@nestjs/config';
import type { Readable } from 'stream';
import {
  ProviderConnectionError,
  ProviderRequestRejectedError,
  ProviderServerError,
} from 'src/common/errors/provider.errors';
import { MicrosoftGraphClient } from './microsoft-graph.client';

const ORIGIN = 'https://graph.microsoft.com';
const TOKEN = 'graph-token';

type Handler = (url: string, init: RequestInit) => Response;

function clientWith(handler: Handler) {
  const calls: { url: string; init: RequestInit }[] = [];
  jest
    .spyOn(global, 'fetch')
    .mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      calls.push({ url, init: init ?? {} });
      return Promise.resolve(handler(url, init ?? {}));
    });
  const config = {
    get: () => ORIGIN,
  } as unknown as ConfigService;
  return { client: new MicrosoftGraphClient(config), calls };
}

const json = (status: number, body: unknown, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

async function readAll(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
  return Buffer.concat(chunks).toString();
}

describe('MicrosoftGraphClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('tells a throttling answer with Retry-After, so the sync backs off until then', async () => {
    const { client } = clientWith(() =>
      json(
        429,
        { error: { code: 'TooManyRequests' } },
        { 'retry-after': '120' },
      ),
    );

    const response = await client.get(TOKEN, '/sites/root');

    expect(response.status).toBe('throttled');
    const { retryAt } = response as { retryAt: Date };
    expect(retryAt.getTime() - Date.now()).toBeGreaterThan(115_000);
  });

  it('tells an unavailable Graph with Retry-After as throttling too', async () => {
    const { client } = clientWith(() => json(503, {}, { 'retry-after': '30' }));

    expect((await client.get(TOKEN, '/sites/root')).status).toBe('throttled');
  });

  it.each([
    ['a rate limit without Retry-After', 429, ProviderRequestRejectedError],
    ['a server error', 500, ProviderServerError],
  ])(
    'throws %s as a provider outage, which pauses the location',
    async (_case, status, error) => {
      const { client } = clientWith(() => json(status, {}));

      await expect(client.get(TOKEN, '/sites/root')).rejects.toBeInstanceOf(
        error,
      );
    },
  );

  it('throws an unreachable Graph as a provider outage', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(
      Object.assign(new TypeError('fetch failed'), {
        cause: Object.assign(new Error('connect ECONNREFUSED'), {
          code: 'ECONNREFUSED',
        }),
      }),
    );
    const client = new MicrosoftGraphClient({
      get: () => ORIGIN,
    } as unknown as ConfigService);

    await expect(client.get(TOKEN, '/sites/root')).rejects.toBeInstanceOf(
      ProviderConnectionError,
    );
  });

  it.each([
    [403, { status: 'access_denied' }],
    [404, { status: 'not_found' }],
    [410, { status: 'resync_required' }],
    [400, { status: 'rejected', httpStatus: 400, code: 'invalidRequest' }],
  ])('tells %i apart', async (status, expected) => {
    const { client } = clientWith(() =>
      json(status, { error: { code: 'invalidRequest' } }),
    );

    expect(await client.get(TOKEN, '/sites/root')).toEqual(expected);
  });

  it('never sends the token to another origin, e.g. in a stored delta link', async () => {
    const { client, calls } = clientWith(() => json(200, { value: [] }));

    await expect(
      client.get(
        TOKEN,
        'https://attacker.example/v1.0/drives/b!1/root/delta?token=1',
      ),
    ).rejects.toThrow('another origin');
    expect(calls).toEqual([]);
  });

  it('downloads through the pre-authenticated URL Graph redirects to, without the token', async () => {
    const download =
      'https://stadt.sharepoint.com/_layouts/15/download.aspx?tempauth=x';
    const { client, calls } = clientWith((url) =>
      url === download
        ? new Response('%PDF-1.7', {
            status: 200,
            headers: {
              'content-length': '8',
              'content-type': 'application/pdf',
            },
          })
        : new Response(null, { status: 302, headers: { location: download } }),
    );

    const result = await client.download(
      TOKEN,
      '/drives/b!1/items/01A/content',
    );

    if (result.status !== 'ok') throw new Error(result.status);
    expect(result.size).toBe(8);
    expect(result.contentType).toBe('application/pdf');
    expect(await readAll(result.content)).toBe('%PDF-1.7');
    expect(calls.map(({ url }) => url)).toEqual([
      `${ORIGIN}/v1.0/drives/b!1/items/01A/content`,
      download,
    ]);
    expect(calls[1].init.headers).toBeUndefined();
  });
});
