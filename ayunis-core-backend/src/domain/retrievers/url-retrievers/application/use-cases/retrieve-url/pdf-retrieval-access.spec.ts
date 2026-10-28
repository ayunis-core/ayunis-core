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
import {
  FileRetrieverPage,
  FileRetrieverResult,
} from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';
import { PdfExtractionCachePort } from 'src/domain/retrievers/url-retrievers/application/ports/pdf-extraction-cache.port';
import {
  UrlRetrieverHandler,
  type UrlRetrieverInput,
} from 'src/domain/retrievers/url-retrievers/application/ports/url-retriever.handler';
import { RequestPdfExtractionCacheService } from 'src/domain/retrievers/url-retrievers/infrastructure/cache/request-pdf-extraction-cache.service';
import { UrlRetrieverHttpError } from 'src/domain/retrievers/url-retrievers/application/url-retriever.errors';
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
const url = 'https://council.example.de/regulations.pdf';

async function setup() {
  const cls = new ContextService(new AsyncLocalStorage<MyClsStore>());
  const findByDomain = jest.fn().mockResolvedValue({ orgId: owner.orgId });
  const extract = jest
    .fn()
    .mockResolvedValue(
      new FileRetrieverResult([
        new FileRetrieverPage('Original regulations', 1),
      ]),
    );
  const fetch = jest.fn().mockResolvedValue({
    contentType: 'application/pdf',
    finalUrl: url,
    body: Buffer.from('Original PDF'),
  });
  const module = await Test.createTestingModule({
    providers: [
      RetrieveUrlUseCase,
      AssertCrawlDomainAccessUseCase,
      { provide: ContextService, useValue: cls },
      {
        provide: PdfExtractionCachePort,
        useClass: RequestPdfExtractionCacheService,
      },
      { provide: CrawlDomainGrantRepository, useValue: { findByDomain } },
      { provide: UrlRetrieverHandler, useValue: { fetch } },
      { provide: RetrieveFileContentUseCase, useValue: { execute: extract } },
      { provide: PreflightCheckUseCase, useValue: { execute: jest.fn() } },
    ],
  }).compile();
  const useCase = module.get(RetrieveUrlUseCase);
  return { cls, findByDomain, extract, fetch, module, useCase };
}

describe('PDF extraction reuse and retrieval access', () => {
  it('denies a distinct recipient before a grant and allows them after the grant', async () => {
    const fixture = await setup();
    const { cls, useCase, findByDomain, extract } = fixture;
    await cls.runWith(owner, () =>
      useCase.execute(new RetrieveUrlCommand(url, owner.orgId)),
    );
    await cls.runWith(recipient, async () => {
      await expect(
        useCase.execute(new RetrieveUrlCommand(url, recipient.orgId)),
      ).rejects.toBeInstanceOf(CrawlDomainAccessDeniedError);
      findByDomain.mockResolvedValue({ orgId: recipient.orgId });
      const allowed = await useCase.execute(
        new RetrieveUrlCommand(url, recipient.orgId),
      );
      expect(allowed.content).toBe('Original regulations');
    });
    expect(extract).toHaveBeenCalledTimes(2);
    await fixture.module.close();
  });

  it('checks revoked access before reuse and permits reading after access is restored', async () => {
    const fixture = await setup();
    const { cls, useCase, findByDomain, extract } = fixture;
    await cls.runWith(owner, async () => {
      await useCase.execute(new RetrieveUrlCommand(url, owner.orgId));
      findByDomain.mockResolvedValue({ orgId: recipient.orgId });
      await expect(
        useCase.execute(new RetrieveUrlCommand(url, owner.orgId)),
      ).rejects.toBeInstanceOf(CrawlDomainAccessDeniedError);
      findByDomain.mockResolvedValue({ orgId: owner.orgId });
      expect(
        (await useCase.execute(new RetrieveUrlCommand(url, owner.orgId)))
          .content,
      ).toBe('Original regulations');
    });
    expect(extract).toHaveBeenCalledTimes(1);
    await fixture.module.close();
  });

  it('does not serve old content after a failed fetch and document recreation', async () => {
    const fixture = await setup();
    const { cls, useCase, extract, fetch } = fixture;
    await cls.runWith(owner, async () => {
      await useCase.execute(new RetrieveUrlCommand(url, owner.orgId));
      fetch.mockRejectedValueOnce(new UrlRetrieverHttpError(url, 404));
      await expect(
        useCase.execute(new RetrieveUrlCommand(url, owner.orgId)),
      ).rejects.toBeInstanceOf(UrlRetrieverHttpError);
      fetch.mockResolvedValue({
        contentType: 'application/pdf',
        finalUrl: url,
        body: Buffer.from('Recreated PDF'),
      });
      extract.mockResolvedValue(
        new FileRetrieverResult([
          new FileRetrieverPage('Recreated regulations', 1),
        ]),
      );
      expect(
        (await useCase.execute(new RetrieveUrlCommand(url, owner.orgId)))
          .content,
      ).toBe('Recreated regulations');
    });
    expect(extract).toHaveBeenCalledTimes(2);
    await fixture.module.close();
  });

  it('rechecks redirect destinations before reusing extraction', async () => {
    const fixture = await setup();
    const { cls, useCase, findByDomain, extract, fetch } = fixture;
    const redirect = 'https://restricted.example.de/regulations.pdf';
    fetch.mockImplementation(async (input: UrlRetrieverInput) => {
      await input.onRedirect?.(redirect);
      return {
        contentType: 'application/pdf',
        finalUrl: redirect,
        body: Buffer.from('Redirected PDF'),
      };
    });
    await cls.runWith(owner, async () => {
      await useCase.execute(new RetrieveUrlCommand(url, owner.orgId));
      findByDomain.mockImplementation((domain: string) =>
        Promise.resolve({
          orgId:
            domain === 'restricted.example.de' ? recipient.orgId : owner.orgId,
        }),
      );
      await expect(
        useCase.execute(new RetrieveUrlCommand(url, owner.orgId)),
      ).rejects.toBeInstanceOf(CrawlDomainAccessDeniedError);
    });
    expect(extract).toHaveBeenCalledTimes(1);
    await fixture.module.close();
  });
});
