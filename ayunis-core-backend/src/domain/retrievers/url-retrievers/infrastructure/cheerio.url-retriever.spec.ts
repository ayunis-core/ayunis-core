import type { ConfigService } from '@nestjs/config';
import { CheerioUrlRetrieverHandler } from './cheerio.url-retriever';
import {
  UrlRetrieverRetrievalError,
  UrlRetrieverTooManyRedirectsError,
  UrlRetrieverContentTooLargeError,
  UrlRetrieverUnsupportedContentTypeError,
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
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
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

/**
 * Like {@link makeResponse} but exposes a real `body` ReadableStream so the
 * streaming size-cap path is exercised (a stream can only be read once, so build
 * a fresh response per test).
 */
function streamedResponse({
  status = 200,
  headers = {},
  body = '',
}: FakeResponseInit): Response {
  const lower = new Map(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const bytes = new TextEncoder().encode(body);
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: 'STATUS',
    headers: { get: (name: string) => lower.get(name.toLowerCase()) ?? null },
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        if (bytes.byteLength) controller.enqueue(bytes);
        controller.close();
      },
    }),
    arrayBuffer: async () => bytes.buffer,
  } as unknown as Response;
}

function makeHandler(): CheerioUrlRetrieverHandler {
  const config = { get: () => 5000 } as unknown as ConfigService;
  return new CheerioUrlRetrieverHandler(config);
}

function makeHandlerWithCap(
  maxDownloadBytes: number,
): CheerioUrlRetrieverHandler {
  const config = {
    get: (key: string) =>
      key === 'url.maxDownloadBytes' ? maxDownloadBytes : 5000,
  } as unknown as ConfigService;
  const handler = new CheerioUrlRetrieverHandler(config);
  jest.spyOn(handler['logger'], 'error').mockImplementation(() => undefined);
  return handler;
}

describe('CheerioUrlRetrieverHandler.fetch', () => {
  let handler: CheerioUrlRetrieverHandler;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    handler = makeHandler();
    fetchSpy = jest.spyOn(global, 'fetch');
    // Silence the expected error logging in handleTopLevelError.
    jest.spyOn(handler['logger'], 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the raw body and content type without invoking onRedirect when there is no redirect', async () => {
    fetchSpy.mockResolvedValueOnce(HTML_200);
    const onRedirect = jest.fn().mockResolvedValue(undefined);

    const raw = await handler.fetch({
      url: 'https://example.com',
      onRedirect,
    });

    expect(raw.finalUrl).toBe('https://example.com');
    expect(raw.contentType).toContain('text/html');
    expect(raw.body.toString('utf8')).toContain('Hello');
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

    const raw = await handler.fetch({
      url: 'https://start.example.com',
      onRedirect,
    });

    expect(onRedirect).toHaveBeenCalledTimes(1);
    expect(onRedirect).toHaveBeenCalledWith('https://target.example.org/page');
    expect(raw.finalUrl).toBe('https://target.example.org/page');
  });

  it('resolves a relative Location against the current URL', async () => {
    fetchSpy
      .mockResolvedValueOnce(redirect('/next'))
      .mockResolvedValueOnce(HTML_200);
    const onRedirect = jest.fn().mockResolvedValue(undefined);

    await handler.fetch({
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
      handler.fetch({ url: 'https://start.example.com', onRedirect }),
    ).rejects.toBeInstanceOf(CrawlDomainAccessDeniedError);
  });

  it('throws TooManyRedirects when the redirect chain exceeds the cap', async () => {
    fetchSpy.mockResolvedValue(redirect('https://loop.example.com/next'));
    const onRedirect = jest.fn().mockResolvedValue(undefined);

    await expect(
      handler.fetch({ url: 'https://start.example.com', onRedirect }),
    ).rejects.toBeInstanceOf(UrlRetrieverTooManyRedirectsError);
  });

  it('wraps non-domain fetch failures as a retrieval error', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('network down'));

    await expect(
      handler.fetch({ url: 'https://example.com' }),
    ).rejects.toBeInstanceOf(UrlRetrieverRetrievalError);
  });

  it('invokes assertContentType with the headers and rejects before reading the body', async () => {
    const response = streamedResponse({
      headers: { 'content-type': 'image/png' },
      body: 'PNGDATA',
    });
    const readerSpy = jest.spyOn(response.body as ReadableStream, 'getReader');
    fetchSpy.mockResolvedValueOnce(response);
    const assertContentType = jest.fn(() => {
      throw new UrlRetrieverUnsupportedContentTypeError(
        'https://acme.test/logo.png',
        'image/png',
      );
    });

    await expect(
      handler.fetch({ url: 'https://acme.test/logo.png', assertContentType }),
    ).rejects.toBeInstanceOf(UrlRetrieverUnsupportedContentTypeError);

    expect(assertContentType).toHaveBeenCalledWith(
      'image/png',
      'https://acme.test/logo.png',
    );
    // The body must not be touched once the content type is rejected.
    expect(readerSpy).not.toHaveBeenCalled();
  });

  it('does not reject on an overstated Content-Length when the streamed body stays within the cap', async () => {
    // Proxies and buggy servers routinely overstate Content-Length. The real
    // limit is enforced while streaming, so a small body must still succeed
    // even when the header claims it exceeds the cap.
    const capped = makeHandlerWithCap(100);
    fetchSpy.mockResolvedValueOnce(
      streamedResponse({
        headers: {
          'content-type': 'application/pdf',
          'content-length': '9999',
        },
        body: 'tiny',
      }),
    );

    const raw = await capped.fetch({ url: 'https://acme.test/big.pdf' });

    expect(raw.body.toString('utf8')).toBe('tiny');
    expect(raw.contentType).toContain('application/pdf');
  });

  it('aborts and throws when the streamed body exceeds the cap', async () => {
    const capped = makeHandlerWithCap(100);
    fetchSpy.mockResolvedValueOnce(
      streamedResponse({
        headers: { 'content-type': 'text/html' },
        body: 'x'.repeat(500),
      }),
    );

    await expect(
      capped.fetch({ url: 'https://acme.test/huge' }),
    ).rejects.toBeInstanceOf(UrlRetrieverContentTooLargeError);
  });

  it('streams and returns the body when it is within the cap', async () => {
    const capped = makeHandlerWithCap(1000);
    fetchSpy.mockResolvedValueOnce(
      streamedResponse({
        headers: { 'content-type': 'text/html' },
        body: 'hello world',
      }),
    );

    const raw = await capped.fetch({ url: 'https://acme.test/page' });

    expect(raw.body.toString('utf8')).toBe('hello world');
    expect(raw.contentType).toContain('text/html');
  });
});

describe('CheerioUrlRetrieverHandler.parseHtml', () => {
  const handler = makeHandler();

  it('extracts cleaned body text and the page title', () => {
    const result = handler.parseHtml(
      '<html><head><title>Hi</title></head><body>  Hello   world </body></html>',
      'https://acme.test/',
    );

    expect(result.content).toBe('Hello world');
    expect(result.websiteTitle).toBe('Hi');
  });

  it('resolves relative links against the page URL', () => {
    const result = handler.parseHtml(
      '<a href="/about">About</a><a href="team">Team</a>',
      'https://acme.test/docs/',
    );

    expect(result.links).toEqual([
      'https://acme.test/about',
      'https://acme.test/docs/team',
    ]);
  });

  it('keeps only http(s) links and strips fragments and duplicates', () => {
    const result = handler.parseHtml(
      [
        '<a href="https://acme.test/a#section">A</a>',
        '<a href="https://acme.test/a">A again</a>',
        '<a href="mailto:hi@acme.test">Mail</a>',
        '<a href="javascript:void(0)">JS</a>',
        '<a href="tel:+49123">Call</a>',
      ].join(''),
      'https://acme.test/',
    );

    expect(result.links).toEqual(['https://acme.test/a']);
  });
});
