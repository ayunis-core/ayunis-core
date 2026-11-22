/* eslint-disable sonarjs/no-hardcoded-ip -- Fixture IPs exercise private-destination grants. */
import type { UUID } from 'crypto';
import { Test } from '@nestjs/testing';
import { CrawlDomainGrantRepository } from 'src/domain/crawl-domain-grants/application/ports/crawl-domain-grant.repository';
import { AssertCrawlDomainAccessUseCase } from 'src/domain/crawl-domain-grants/application/use-cases/assert-crawl-domain-access/assert-crawl-domain-access.use-case';
import { CrawlDomainAccessDeniedError } from 'src/domain/crawl-domain-grants/application/crawl-domain-grants.errors';
import {
  UrlRetrieverHandler,
  type UrlHeadResponse,
  type UrlRetrieverInput,
} from 'src/domain/retrievers/url-retrievers/application/ports/url-retriever.handler';
import {
  UrlRetrieverContentTooLargeError,
  UrlRetrieverHttpError,
} from 'src/domain/retrievers/url-retrievers/application/url-retriever.errors';
import {
  PDF_VERSION_TOO_LARGE,
  pdfVersionFromContent,
} from 'src/domain/retrievers/url-retrievers/domain/pdf-version';
import { GetPdfVersionUseCase } from './get-pdf-version.use-case';
import { GetPdfVersionCommand } from './get-pdf-version.command';

const ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const OTHER_ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const URL = 'https://www.musterstadt.de/satzungen/gebuehren.pdf';
const PDF = Buffer.from('%PDF-1.7 Gebührensatzung');

function headResponse(overrides: Partial<UrlHeadResponse>): UrlHeadResponse {
  return {
    finalUrl: URL,
    etag: null,
    lastModified: null,
    contentLength: null,
    ...overrides,
  };
}

async function setup(grants: Record<string, UUID> = {}) {
  const head = jest.fn<Promise<UrlHeadResponse>, [UrlRetrieverInput]>();
  const fetch = jest.fn((input: UrlRetrieverInput) =>
    Promise.resolve({
      contentType: 'application/pdf',
      finalUrl: input.url,
      body: PDF,
    }),
  );
  const findByDomain = jest.fn((domain: string) =>
    Promise.resolve(grants[domain] ? { orgId: grants[domain] } : null),
  );
  const module = await Test.createTestingModule({
    providers: [
      GetPdfVersionUseCase,
      AssertCrawlDomainAccessUseCase,
      { provide: CrawlDomainGrantRepository, useValue: { findByDomain } },
      { provide: UrlRetrieverHandler, useValue: { head, fetch } },
    ],
  }).compile();
  return { useCase: module.get(GetPdfVersionUseCase), head, fetch };
}

describe('GetPdfVersionUseCase', () => {
  it('reads the version from the HEAD response without downloading the PDF', async () => {
    const { useCase, head, fetch } = await setup();
    head.mockResolvedValue(
      headResponse({ etag: '"v3"', contentLength: '24411' }),
    );

    await expect(
      useCase.execute(new GetPdfVersionCommand(URL, ORG_ID)),
    ).resolves.toBe('etag:"v3"');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('hashes the download when the server sends no validator', async () => {
    const { useCase, head } = await setup();
    head.mockResolvedValue(headResponse({}));

    await expect(
      useCase.execute(new GetPdfVersionCommand(URL, ORG_ID)),
    ).resolves.toBe(pdfVersionFromContent(PDF));
  });

  it('hashes the download when the server refuses HEAD', async () => {
    const { useCase, head } = await setup();
    head.mockRejectedValue(new UrlRetrieverHttpError(URL, 405));

    await expect(
      useCase.execute(new GetPdfVersionCommand(URL, ORG_ID)),
    ).resolves.toBe(pdfVersionFromContent(PDF));
  });

  it('keeps a PDF without validators listed when its download exceeds the cap', async () => {
    const { useCase, head, fetch } = await setup();
    head.mockResolvedValue(headResponse({ contentLength: '0' }));
    fetch.mockRejectedValue(
      new UrlRetrieverContentTooLargeError(URL, 25 * 1024 * 1024),
    );

    await expect(
      useCase.execute(new GetPdfVersionCommand(URL, ORG_ID)),
    ).resolves.toBe(PDF_VERSION_TOO_LARGE);
  });

  it('refuses a PDF on a domain granted to another organization before any request', async () => {
    const { useCase, head, fetch } = await setup({
      'www.musterstadt.de': OTHER_ORG_ID,
    });

    await expect(
      useCase.execute(new GetPdfVersionCommand(URL, ORG_ID)),
    ).rejects.toBeInstanceOf(CrawlDomainAccessDeniedError);
    expect(head).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refuses redirects and private destinations of the HEAD request like those of the download', async () => {
    const { useCase, head } = await setup({
      'intranet.musterstadt.de': OTHER_ORG_ID,
      '10.0.0.9': ORG_ID,
    });
    let input: UrlRetrieverInput | undefined;
    head.mockImplementation((request) => {
      input = request;
      return Promise.resolve(headResponse({ etag: '"v3"' }));
    });
    await useCase.execute(new GetPdfVersionCommand(URL, ORG_ID));

    await expect(
      input?.onRedirect?.('https://intranet.musterstadt.de/a.pdf'),
    ).rejects.toBeInstanceOf(CrawlDomainAccessDeniedError);
    // A private destination needs an explicit grant to this organization.
    await expect(
      input?.assertPrivateDestinationAccess?.('https://10.0.0.8/a.pdf'),
    ).rejects.toBeInstanceOf(CrawlDomainAccessDeniedError);
    await expect(
      input?.assertPrivateDestinationAccess?.('https://10.0.0.9/a.pdf'),
    ).resolves.toBeUndefined();
  });
});
