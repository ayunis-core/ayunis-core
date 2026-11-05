import { AsyncLocalStorage } from 'async_hooks';
import { Test } from '@nestjs/testing';
import {
  ContextService,
  type MyClsStore,
} from 'src/common/context/services/context.service';
import { CrawlDomainGrantRepository } from 'src/domain/crawl-domain-grants/application/ports/crawl-domain-grant.repository';
import { AssertCrawlDomainAccessUseCase } from 'src/domain/crawl-domain-grants/application/use-cases/assert-crawl-domain-access/assert-crawl-domain-access.use-case';
import { CrawlDomainAccessDeniedError } from 'src/domain/crawl-domain-grants/application/crawl-domain-grants.errors';
import { PreflightCheckUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/preflight-check/preflight-check.use-case';
import { RetrieveFileContentUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import { PdfExtractionCachePort } from 'src/domain/retrievers/url-retrievers/application/ports/pdf-extraction-cache.port';
import { UrlRetrievalCachePort } from 'src/domain/retrievers/url-retrievers/application/ports/url-retrieval-cache.port';
import {
  UrlRetrieverHandler,
  type UrlRetrieverInput,
} from 'src/domain/retrievers/url-retrievers/application/ports/url-retriever.handler';
import { UrlRetrieverHttpError } from 'src/domain/retrievers/url-retrievers/application/url-retriever.errors';
import { RequestPdfExtractionCacheService } from 'src/domain/retrievers/url-retrievers/infrastructure/cache/request-pdf-extraction-cache.service';
import { RequestUrlRetrievalCacheService } from 'src/domain/retrievers/url-retrievers/infrastructure/cache/request-url-retrieval-cache.service';
import { UrlRetrieverResult } from 'src/domain/retrievers/url-retrievers/domain/url-retriever-result.entity';
import { RetrieveUrlUseCase } from './retrieve-url.use-case';
import { RetrieveUrlCommand } from './retrieve-url.command';

const owner = {
  orgId: '11111111-1111-1111-1111-111111111111',
  userId: '33333333-3333-3333-3333-333333333333',
} as const;
const recipient = {
  orgId: '22222222-2222-2222-2222-222222222222',
  userId: '44444444-4444-4444-4444-444444444444',
} as const;
const url = 'https://intranet.stadt.example.de/dienstanweisungen';

async function setup() {
  const cls = new ContextService(new AsyncLocalStorage<MyClsStore>());
  const findByDomain = jest.fn().mockResolvedValue({ orgId: owner.orgId });
  const fetch = jest.fn().mockResolvedValue({
    contentType: 'text/html',
    finalUrl: url,
    body: Buffer.from('<main>Dienstanweisung Homeoffice</main>'),
  });
  const parseHtml = jest.fn(
    (html: string, finalUrl: string) =>
      new UrlRetrieverResult(html, finalUrl, 'Dienstanweisungen'),
  );
  const module = await Test.createTestingModule({
    providers: [
      RetrieveUrlUseCase,
      AssertCrawlDomainAccessUseCase,
      { provide: ContextService, useValue: cls },
      {
        provide: PdfExtractionCachePort,
        useClass: RequestPdfExtractionCacheService,
      },
      {
        provide: UrlRetrievalCachePort,
        useClass: RequestUrlRetrievalCacheService,
      },
      { provide: CrawlDomainGrantRepository, useValue: { findByDomain } },
      { provide: UrlRetrieverHandler, useValue: { fetch, parseHtml } },
      { provide: RetrieveFileContentUseCase, useValue: { execute: jest.fn() } },
      { provide: PreflightCheckUseCase, useValue: { execute: jest.fn() } },
    ],
  }).compile();
  const useCase = module.get(RetrieveUrlUseCase);
  const read = (orgId: string) =>
    useCase.execute(new RetrieveUrlCommand(url, orgId as typeof owner.orgId));
  return { cls, findByDomain, fetch, module, read };
}

describe('URL retrieval reuse within a request', () => {
  it('fetches a page once per request and again in the next request', async () => {
    const fixture = await setup();
    const { cls, fetch, read } = fixture;

    await cls.runWith({ ...owner }, async () => {
      await read(owner.orgId);
      await read(owner.orgId);
      await read(owner.orgId);
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    await cls.runWith({ ...owner }, () => read(owner.orgId));
    expect(fetch).toHaveBeenCalledTimes(2);
    await fixture.module.close();
  });

  it('denies a distinct recipient before a grant and allows them after the grant', async () => {
    const fixture = await setup();
    const { cls, fetch, findByDomain, read } = fixture;
    await cls.runWith({ ...owner }, () => read(owner.orgId));

    await cls.runWith({ ...recipient }, async () => {
      await expect(read(recipient.orgId)).rejects.toBeInstanceOf(
        CrawlDomainAccessDeniedError,
      );
      findByDomain.mockResolvedValue({ orgId: recipient.orgId });
      expect((await read(recipient.orgId)).content).toBe(
        '<main>Dienstanweisung Homeoffice</main>',
      );
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    await fixture.module.close();
  });

  it('checks a revoked grant before reusing a page', async () => {
    const fixture = await setup();
    const { cls, findByDomain, read } = fixture;

    await cls.runWith({ ...owner }, async () => {
      await read(owner.orgId);
      findByDomain.mockResolvedValue({ orgId: recipient.orgId });
      await expect(read(owner.orgId)).rejects.toBeInstanceOf(
        CrawlDomainAccessDeniedError,
      );
    });
    await fixture.module.close();
  });

  it('rechecks the redirect destination before reusing a page', async () => {
    const fixture = await setup();
    const { cls, fetch, findByDomain, read } = fixture;
    const redirect = 'https://restricted.example.de/dienstanweisungen';
    fetch.mockImplementation(async (input: UrlRetrieverInput) => {
      await input.onRedirect?.(redirect);
      return {
        contentType: 'text/html',
        finalUrl: redirect,
        body: Buffer.from('<main>Umgeleitet</main>'),
      };
    });

    await cls.runWith({ ...owner }, async () => {
      await read(owner.orgId);
      findByDomain.mockImplementation((domain: string) =>
        Promise.resolve({
          orgId:
            domain === 'restricted.example.de' ? recipient.orgId : owner.orgId,
        }),
      );
      await expect(read(owner.orgId)).rejects.toBeInstanceOf(
        CrawlDomainAccessDeniedError,
      );
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    await fixture.module.close();
  });

  it('fetches again when a retry follows a failed fetch', async () => {
    const fixture = await setup();
    const { cls, fetch, read } = fixture;
    fetch.mockRejectedValueOnce(new UrlRetrieverHttpError(url, 503));

    await cls.runWith({ ...owner }, async () => {
      await expect(read(owner.orgId)).rejects.toBeInstanceOf(
        UrlRetrieverHttpError,
      );
      expect((await read(owner.orgId)).content).toBe(
        '<main>Dienstanweisung Homeoffice</main>',
      );
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    await fixture.module.close();
  });
});
