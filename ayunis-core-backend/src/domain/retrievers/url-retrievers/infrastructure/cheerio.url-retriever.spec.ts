import type { ConfigService } from '@nestjs/config';
import { CheerioUrlRetrieverHandler } from './cheerio.url-retriever';
import {
  UrlRetrieverRetrievalError,
  UrlRetrieverTooManyRedirectsError,
} from '../application/url-retriever.errors';
import { CrawlDomainAccessDeniedError } from 'src/domain/crawl-domain-grants/application/crawl-domain-grants.errors';

interface FakeResponseInit {
  status?: number;
  headers?: Record<string, string>;
  body?: string;
}

function makeResponse({
  status = 200,
  headers = {},
  body = '',
}: FakeResponseInit): Response {
  const lower = new Map(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: 'STATUS',
    headers: { get: (name: string) => lower.get(name.toLowerCase()) ?? null },
    text: async () => body,
  } as unknown as Response;
}

const HTML_200 = makeResponse({
  status: 200,
  headers: { 'content-type': 'text/html' },
  body: '<html><head><title>Hi</title></head><body>Hello</body></html>',
});

function redirect(location: string, status = 302): Response {
  return makeResponse({ status, headers: { location } });
}

describe('CheerioUrlRetrieverHandler', () => {
  let handler: CheerioUrlRetrieverHandler;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    const config = { get: () => 5000 } as unknown as ConfigService;
    handler = new CheerioUrlRetrieverHandler(config);
    fetchSpy = jest.spyOn(global, 'fetch');
    // Silence the expected error logging in handleTopLevelError.
    jest.spyOn(handler['logger'], 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns parsed content without invoking onRedirect when there is no redirect', async () => {
    fetchSpy.mockResolvedValueOnce(HTML_200);
    const onRedirect = jest.fn().mockResolvedValue(undefined);

    const result = await handler.retrieveUrl({
      url: 'https://example.com',
      onRedirect,
    });

    expect(result.content).toBe('Hello');
    expect(result.url).toBe('https://example.com');
    expect(onRedirect).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    // The fetch must use manual redirect handling so the gate sees each hop.
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ redirect: 'manual' });
  });

  it('invokes onRedirect with the absolute target before following a redirect', async () => {
    fetchSpy
      .mockResolvedValueOnce(redirect('https://target.example.org/page'))
      .mockResolvedValueOnce(HTML_200);
    const onRedirect = jest.fn().mockResolvedValue(undefined);

    const result = await handler.retrieveUrl({
      url: 'https://start.example.com',
      onRedirect,
    });

    expect(onRedirect).toHaveBeenCalledTimes(1);
    expect(onRedirect).toHaveBeenCalledWith('https://target.example.org/page');
    expect(result.content).toBe('Hello');
    expect(result.url).toBe('https://target.example.org/page');
  });

  it('resolves a relative Location against the current URL', async () => {
    fetchSpy
      .mockResolvedValueOnce(redirect('/next'))
      .mockResolvedValueOnce(HTML_200);
    const onRedirect = jest.fn().mockResolvedValue(undefined);

    await handler.retrieveUrl({
      url: 'https://start.example.com/a/b',
      onRedirect,
    });

    expect(onRedirect).toHaveBeenCalledWith('https://start.example.com/next');
  });

  it('propagates a gate denial unchanged (not masked as a retrieval error)', async () => {
    fetchSpy.mockResolvedValueOnce(redirect('https://restricted.example.org'));
    const onRedirect = jest
      .fn()
      .mockRejectedValue(new CrawlDomainAccessDeniedError());

    await expect(
      handler.retrieveUrl({ url: 'https://start.example.com', onRedirect }),
    ).rejects.toBeInstanceOf(CrawlDomainAccessDeniedError);
  });

  it('throws TooManyRedirects when the redirect chain exceeds the cap', async () => {
    fetchSpy.mockResolvedValue(redirect('https://loop.example.com/next'));
    const onRedirect = jest.fn().mockResolvedValue(undefined);

    await expect(
      handler.retrieveUrl({ url: 'https://start.example.com', onRedirect }),
    ).rejects.toBeInstanceOf(UrlRetrieverTooManyRedirectsError);
  });

  it('wraps non-domain fetch failures as a retrieval error', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('network down'));

    await expect(
      handler.retrieveUrl({ url: 'https://example.com' }),
    ).rejects.toBeInstanceOf(UrlRetrieverRetrievalError);
  });
});
