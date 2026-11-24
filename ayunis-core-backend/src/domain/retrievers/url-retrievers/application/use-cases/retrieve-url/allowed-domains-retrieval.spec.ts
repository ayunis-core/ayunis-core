import { AsyncLocalStorage } from 'async_hooks';
import type { UUID } from 'crypto';
import type { ConfigService } from '@nestjs/config';
import {
  ContextService,
  type MyClsStore,
} from 'src/common/context/services/context.service';
import type { AssertCrawlDomainAccessUseCase } from 'src/domain/crawl-domain-grants/application/use-cases/assert-crawl-domain-access/assert-crawl-domain-access.use-case';
import type { PreflightCheckUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/preflight-check/preflight-check.use-case';
import type { RetrieveFileContentUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import { UrlRetrieverDomainNotAllowedError } from 'src/domain/retrievers/url-retrievers/application/url-retriever.errors';
import { AllowedDomains } from 'src/domain/retrievers/url-retrievers/domain/allowed-domains';
import { RequestPdfExtractionCacheService } from 'src/domain/retrievers/url-retrievers/infrastructure/cache/request-pdf-extraction-cache.service';
import { RequestUrlRetrievalCacheService } from 'src/domain/retrievers/url-retrievers/infrastructure/cache/request-url-retrieval-cache.service';
import { CheerioUrlRetrieverHandler } from 'src/domain/retrievers/url-retrievers/infrastructure/cheerio.url-retriever';
import { RetrieveUrlCommand } from './retrieve-url.command';
import { RetrieveUrlUseCase } from './retrieve-url.use-case';

const ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const allowedDomains = new AllowedDomains(['nrw.de', 'bund.de']);

function page(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/html' },
  });
}

function redirectTo(location: string): Response {
  return new Response(null, { status: 302, headers: { location } });
}

function setup() {
  const cls = new ContextService(new AsyncLocalStorage<MyClsStore>());
  const handler = new CheerioUrlRetrieverHandler(
    { getOrThrow: () => 5000 } as unknown as ConfigService,
    {} as never,
  );
  const useCase = new RetrieveUrlUseCase(
    handler,
    {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as AssertCrawlDomainAccessUseCase,
    {} as RetrieveFileContentUseCase,
    {} as PreflightCheckUseCase,
    new RequestPdfExtractionCacheService(cls),
    new RequestUrlRetrievalCacheService(cls),
  );
  const fetchSpy = jest
    .spyOn(global, 'fetch')
    .mockRejectedValue(new Error('Unexpected request'));
  const contactedUrls = () =>
    fetchSpy.mock.calls.map(([url]) => String(url as string));
  const read = (url: string, domains?: AllowedDomains) =>
    useCase.execute(
      new RetrieveUrlCommand(url, ORG_ID, undefined, 'existing', domains),
    );
  const inRequest = <T>(fn: () => Promise<T>) =>
    cls.runWith({ orgId: ORG_ID }, fn);
  return { fetchSpy, contactedUrls, read, inRequest };
}

describe('RetrieveUrlUseCase with allowed domains', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches a page on a subdomain of an allowed domain', async () => {
    const { fetchSpy, read } = setup();
    fetchSpy.mockResolvedValueOnce(page('<main>Gesetzblatt 2026</main>'));

    const result = await read('https://recht.nrw.de/gv/2026', allowedDomains);

    expect(result.content).toContain('Gesetzblatt 2026');
  });

  it('never contacts a disallowed host and names the allowed domains in the error', async () => {
    const { contactedUrls, read } = setup();

    const error = await read(
      'https://nrw.de.evil.example.com/gv',
      allowedDomains,
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UrlRetrieverDomainNotAllowedError);
    expect((error as Error).message).toContain('nrw.de, bund.de');
    expect(contactedUrls()).toEqual([]);
  });

  it('stops before contacting a disallowed host an allowed page redirects to', async () => {
    const { fetchSpy, contactedUrls, read } = setup();
    fetchSpy.mockResolvedValueOnce(
      redirectTo('https://tracker.example.com/landing'),
    );

    await expect(
      read('https://recht.nrw.de/gv/2026', allowedDomains),
    ).rejects.toBeInstanceOf(UrlRetrieverDomainNotAllowedError);
    expect(contactedUrls()).toEqual(['https://recht.nrw.de/gv/2026']);
  });

  it('follows a redirect between allowed domains', async () => {
    const { fetchSpy, contactedUrls, read } = setup();
    fetchSpy
      .mockResolvedValueOnce(redirectTo('https://www.recht.bund.de/bgbl'))
      .mockResolvedValueOnce(page('<main>Bundesgesetzblatt</main>'));

    const result = await read('https://recht.nrw.de/bgbl', allowedDomains);

    expect(result.url).toBe('https://www.recht.bund.de/bgbl');
    expect(contactedUrls()).toEqual([
      'https://recht.nrw.de/bgbl',
      'https://www.recht.bund.de/bgbl',
    ]);
  });

  it('denies a cached page whose final URL is outside the allowed domains', async () => {
    const { fetchSpy, read, inRequest } = setup();
    fetchSpy
      .mockResolvedValueOnce(redirectTo('https://portal.example.com/gv'))
      .mockResolvedValueOnce(page('<main>Portal</main>'));

    await inRequest(async () => {
      await read('https://recht.nrw.de/gv');
      await expect(
        read('https://recht.nrw.de/gv', allowedDomains),
      ).rejects.toBeInstanceOf(UrlRetrieverDomainNotAllowedError);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
