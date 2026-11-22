import type { UUID } from 'crypto';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// p-limit is ESM-only — mock the dynamic import so Jest (CJS) doesn't choke.
jest.mock('p-limit', () => ({
  __esModule: true,
  default:
    () =>
    <T>(fn: () => T) =>
      fn(),
}));

import { CrawlUrlUseCase } from './crawl-url.use-case';
import { CrawlUrlCommand } from './crawl-url.command';
import { RetrieveUrlUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.use-case';
import type { RetrieveUrlCommand } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.command';
import { UrlRetrieverResult } from 'src/domain/retrievers/url-retrievers/domain/url-retriever-result.entity';
import { UrlCrawlConstants } from 'src/domain/retrievers/url-retrievers/domain/url-crawl.constants';
import {
  UrlRetrieverContentTooLargeError,
  UrlRetrieverHttpError,
  UrlRetrieverParsingError,
  UrlRetrieverProviderNotAvailableError,
  UrlRetrieverTimeoutError,
  UrlRetrieverTooManyRedirectsError,
  UrlRetrieverUnsupportedContentTypeError,
} from 'src/domain/retrievers/url-retrievers/application/url-retriever.errors';
import { GetPdfVersionUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/get-pdf-version/get-pdf-version.use-case';
import { UrlCrawlFailureKind } from 'src/domain/retrievers/url-retrievers/domain/url-crawl-result.entity';
import { CrawlDomainAccessDeniedError } from 'src/domain/crawl-domain-grants/application/crawl-domain-grants.errors';
import { TooManyPagesError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';

const ORG_ID = '00000000-0000-0000-0000-000000000010' as UUID;

/**
 * Builds a fake RetrieveUrlUseCase backed by an in-memory map of
 * url -> { content, title, links }. Unknown urls reject, mimicking a fetch
 * failure for that page.
 */
function fakeRetriever(
  pages: Record<
    string,
    { title?: string; links?: string[]; finalUrl?: string }
  >,
): Pick<RetrieveUrlUseCase, 'execute'> {
  return {
    execute: jest.fn(({ url }: { url: string }) => {
      const page = pages[url];
      if (!page) {
        return Promise.reject(
          new UrlRetrieverProviderNotAvailableError('cheerio', { url }),
        );
      }
      // finalUrl models a redirect: the result is keyed to the landing URL,
      // not the requested one (mirrors the cheerio retriever's finalUrl).
      const resolvedUrl = page.finalUrl ?? url;
      return Promise.resolve(
        new UrlRetrieverResult(
          `content of ${resolvedUrl}`,
          resolvedUrl,
          page.title ?? resolvedUrl,
          {},
          page.links ?? [],
        ),
      );
    }),
  };
}

async function buildUseCase(
  retriever: Pick<RetrieveUrlUseCase, 'execute'>,
  pdfVersions: Pick<GetPdfVersionUseCase, 'execute'> = {
    execute: jest.fn(({ url }: { url: string }) =>
      Promise.resolve(`etag:${url}`),
    ),
  },
): Promise<CrawlUrlUseCase> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CrawlUrlUseCase,
      { provide: RetrieveUrlUseCase, useValue: retriever },
      { provide: GetPdfVersionUseCase, useValue: pdfVersions },
    ],
  }).compile();
  return module.get(CrawlUrlUseCase);
}

/** A retriever whose listed URLs reject with the given error. */
function failingRetriever(
  pages: Record<string, { links?: string[] }>,
  failures: Record<string, Error>,
): Pick<RetrieveUrlUseCase, 'execute'> {
  const pagesRetriever = fakeRetriever(pages);
  return {
    execute: jest.fn((command: RetrieveUrlCommand) =>
      failures[command.url]
        ? Promise.reject(failures[command.url])
        : pagesRetriever.execute(command),
    ),
  };
}

describe('CrawlUrlUseCase', () => {
  it('discovers PDFs at depth zero without fetching them as HTML pages', async () => {
    const retriever = fakeRetriever({
      'https://acme.test/': {
        links: [
          'https://acme.test/navigation',
          'https://cdn.test/statute.PDF#page=2',
          'https://cdn.test/statute.PDF',
        ],
      },
    });
    const useCase = await buildUseCase(retriever);
    const result = await useCase.execute(
      new CrawlUrlCommand('https://acme.test/', ORG_ID, 0),
    );
    expect(result.pdfLinks).toEqual([
      { url: 'https://cdn.test/statute.PDF', name: 'statute.PDF' },
    ]);
    expect(result.pages).toHaveLength(1);
    expect(retriever.execute).toHaveBeenCalledTimes(1);
  });

  it('keeps separate HTML and PDF budgets and discovers PDFs on the last HTML page', async () => {
    const htmlLinks = Array.from(
      { length: 24 },
      (_, i) => `https://acme.test/page-${i}`,
    );
    const pdfLinks = Array.from(
      { length: 30 },
      (_, i) => `https://cdn.test/statute-${i}.pdf`,
    );
    const retriever = fakeRetriever({
      'https://acme.test/': { links: [pdfLinks[0], ...htmlLinks] },
      ...Object.fromEntries(htmlLinks.map((url) => [url, { links: pdfLinks }])),
    });
    const result = await (
      await buildUseCase(retriever)
    ).execute(new CrawlUrlCommand('https://acme.test/', ORG_ID, 1));
    expect(result.pages).toHaveLength(25);
    expect(result.pdfLinks).toHaveLength(25);
    expect(new Set(result.pdfLinks.map((link) => link.url)).size).toBe(25);
    expect(retriever.execute).toHaveBeenCalledTimes(25);
  });

  it('returns only the root page when depth is 0', async () => {
    const retriever = fakeRetriever({
      'https://acme.test/': { links: ['https://acme.test/about'] },
      'https://acme.test/about': {},
    });
    const useCase = await buildUseCase(retriever);

    const result = await useCase.execute(
      new CrawlUrlCommand('https://acme.test/', ORG_ID, 0),
    );

    expect(result.pages.map((p) => p.url)).toEqual(['https://acme.test/']);
    expect(retriever.execute).toHaveBeenCalledTimes(1);
  });

  it('follows same-site links one level deep at depth 1', async () => {
    const retriever = fakeRetriever({
      'https://acme.test/': {
        links: ['https://acme.test/about', 'https://acme.test/team'],
      },
      'https://acme.test/about': { links: ['https://acme.test/deep'] },
      'https://acme.test/team': {},
      'https://acme.test/deep': {},
    });
    const useCase = await buildUseCase(retriever);

    const result = await useCase.execute(
      new CrawlUrlCommand('https://acme.test/', ORG_ID, 1),
    );

    expect(
      result.pages.map((p) => p.url).sort((a, b) => a.localeCompare(b)),
    ).toEqual([
      'https://acme.test/',
      'https://acme.test/about',
      'https://acme.test/team',
    ]);
    // The grandchild link is not followed at depth 1.
    expect(result.pages.map((p) => p.url)).not.toContain(
      'https://acme.test/deep',
    );
  });

  it('reaches grandchildren at depth 2', async () => {
    const retriever = fakeRetriever({
      'https://acme.test/': { links: ['https://acme.test/about'] },
      'https://acme.test/about': { links: ['https://acme.test/deep'] },
      'https://acme.test/deep': {},
    });
    const useCase = await buildUseCase(retriever);

    const result = await useCase.execute(
      new CrawlUrlCommand('https://acme.test/', ORG_ID, 2),
    );

    expect(result.pages.map((p) => p.url)).toContain('https://acme.test/deep');
  });

  it('does not follow links to other domains', async () => {
    const retriever = fakeRetriever({
      'https://acme.test/': {
        links: ['https://evil.test/phish', 'https://acme.test/ok'],
      },
      'https://acme.test/ok': {},
      'https://evil.test/phish': {},
    });
    const useCase = await buildUseCase(retriever);

    const result = await useCase.execute(
      new CrawlUrlCommand('https://acme.test/', ORG_ID, 1),
    );

    expect(result.pages.map((p) => p.url)).toEqual([
      'https://acme.test/',
      'https://acme.test/ok',
    ]);
  });

  it('visits each page at most once even with cyclic links', async () => {
    const retriever = fakeRetriever({
      'https://acme.test/': { links: ['https://acme.test/a'] },
      'https://acme.test/a': { links: ['https://acme.test/'] },
    });
    const useCase = await buildUseCase(retriever);

    const result = await useCase.execute(
      new CrawlUrlCommand('https://acme.test/', ORG_ID, 2),
    );

    expect(result.pages.map((p) => p.url)).toEqual([
      'https://acme.test/',
      'https://acme.test/a',
    ]);
  });

  it('caps the total number of pages at MAX_PAGES', async () => {
    const links = Array.from(
      { length: UrlCrawlConstants.MAX_PAGES + 20 },
      (_, i) => `https://acme.test/p${i}`,
    );
    const pages: Record<string, { links?: string[] }> = {
      'https://acme.test/': { links },
    };
    for (const link of links) pages[link] = {};
    const useCase = await buildUseCase(fakeRetriever(pages));

    const result = await useCase.execute(
      new CrawlUrlCommand('https://acme.test/', ORG_ID, 1),
    );

    expect(result.pages).toHaveLength(UrlCrawlConstants.MAX_PAGES);
  });

  it('never exceeds MAX_PAGES when a depth-2 frontier over-budgets', async () => {
    // Regression: at depth 1 the first child reserves nearly all remaining
    // capacity for the next frontier; without budgeting against the final
    // page count, the remaining children in the same batch still pushed and
    // the over-sized frontier was fetched wholesale at depth 2, blowing the
    // cap (pages could nearly double MAX_PAGES).
    const grandchildren = Array.from(
      { length: UrlCrawlConstants.MAX_PAGES + 5 },
      (_, i) => `https://acme.test/g${i}`,
    );
    const pages: Record<string, { links?: string[] }> = {
      'https://acme.test/': {
        links: [
          'https://acme.test/c1',
          'https://acme.test/c2',
          'https://acme.test/c3',
        ],
      },
      // c1 alone offers more grandchildren than there are free slots.
      'https://acme.test/c1': { links: grandchildren },
      'https://acme.test/c2': {},
      'https://acme.test/c3': {},
    };
    for (const link of grandchildren) pages[link] = {};
    const useCase = await buildUseCase(fakeRetriever(pages));

    const result = await useCase.execute(
      new CrawlUrlCommand('https://acme.test/', ORG_ID, 2),
    );

    expect(result.pages.length).toBeLessThanOrEqual(
      UrlCrawlConstants.MAX_PAGES,
    );
    expect(result.pages).toHaveLength(UrlCrawlConstants.MAX_PAGES);
  });

  it('treats www and apex variants of a link as the same page', async () => {
    // Regression: the visited key (normalize) did not strip `www.` while
    // same-site detection (hostOf) did, so the apex and www variants of one
    // page were fetched twice, duplicating content and wasting the budget.
    const retriever = fakeRetriever({
      'https://acme.test/': {
        links: ['https://www.acme.test/about', 'https://acme.test/about'],
      },
      'https://www.acme.test/about': {},
    });
    const useCase = await buildUseCase(retriever);

    const result = await useCase.execute(
      new CrawlUrlCommand('https://acme.test/', ORG_ID, 1),
    );

    // Root + a single "about" page — not two.
    expect(result.pages).toHaveLength(2);
    expect(retriever.execute).toHaveBeenCalledTimes(2);
  });

  it('anchors crawl identity to the post-redirect root URL', async () => {
    // Regression: rootHost/visited were derived from the requested URL while
    // links and stored pages use the post-redirect URL. After a subdomain->apex
    // redirect, valid same-site links were rejected and the landing URL could
    // be re-fetched as a child.
    const retriever = fakeRetriever({
      // Requested host (blog.) redirects to the apex; the landing page links to
      // itself and to a sibling, both on the apex host.
      'https://blog.acme.test/': {
        finalUrl: 'https://acme.test/',
        links: ['https://acme.test/', 'https://acme.test/about'],
      },
      'https://acme.test/about': {},
    });
    const useCase = await buildUseCase(retriever);

    const result = await useCase.execute(
      new CrawlUrlCommand('https://blog.acme.test/', ORG_ID, 1),
    );

    // The apex 'about' link is followed (same-site against the landing host),
    // and the self-link is recognized as the already-visited root, not refetched.
    expect(
      result.pages.map((p) => p.url).sort((a, b) => a.localeCompare(b)),
    ).toEqual(['https://acme.test/', 'https://acme.test/about']);
    expect(retriever.execute).toHaveBeenCalledTimes(2);
  });

  it('dedupes child pages that redirect to one canonical URL', async () => {
    // Regression: selectLinks marked the pre-redirect href visited, but pages
    // are stored under the post-redirect URL, which was never recorded. Two
    // links collapsing to one landing page produced duplicate pages and wasted
    // MAX_PAGES budget; a later link pointing straight at the redirect target
    // would also re-fetch it.
    const retriever = fakeRetriever({
      'https://acme.test/': {
        links: ['https://acme.test/x', 'https://acme.test/y'],
      },
      'https://acme.test/x': { finalUrl: 'https://acme.test/canonical' },
      'https://acme.test/y': { finalUrl: 'https://acme.test/canonical' },
    });
    const useCase = await buildUseCase(retriever);

    const result = await useCase.execute(
      new CrawlUrlCommand('https://acme.test/', ORG_ID, 1),
    );

    // Both children land on the same canonical page — stored once, not twice.
    expect(result.pages.map((p) => p.url)).toEqual([
      'https://acme.test/',
      'https://acme.test/canonical',
    ]);
  });

  it('skips child pages that fail to fetch but keeps the rest', async () => {
    const retriever = fakeRetriever({
      'https://acme.test/': {
        links: ['https://acme.test/broken', 'https://acme.test/ok'],
      },
      // 'broken' is intentionally absent -> retriever rejects for it.
      'https://acme.test/ok': {},
    });
    const useCase = await buildUseCase(retriever);

    const result = await useCase.execute(
      new CrawlUrlCommand('https://acme.test/', ORG_ID, 1),
    );

    expect(result.pages.map((p) => p.url)).toEqual([
      'https://acme.test/',
      'https://acme.test/ok',
    ]);
    expect(result.failures).toEqual([
      { url: 'https://acme.test/broken', kind: UrlCrawlFailureKind.TRANSIENT },
    ]);
  });

  it('skips a PDF link that exceeds the page cap and keeps crawling the site', async () => {
    // AYC-332: the PDF page cap is a hard error for a single fetch, but a crawl
    // must not abandon a whole site because one linked PDF is too long.
    const links: Record<string, string[]> = {
      'https://acme.test/': [
        'https://acme.test/haushaltsplan.pdf',
        'https://acme.test/ok',
      ],
      'https://acme.test/ok': [],
    };
    const retriever = {
      execute: jest.fn(({ url }: { url: string }) =>
        url.endsWith('.pdf')
          ? Promise.reject(
              new TooManyPagesError({ pageCount: 4200, maxPages: 1000 }),
            )
          : Promise.resolve(
              new UrlRetrieverResult(
                `content of ${url}`,
                url,
                url,
                {},
                links[url],
              ),
            ),
      ),
    };
    const useCase = await buildUseCase(retriever);

    const result = await useCase.execute(
      new CrawlUrlCommand('https://acme.test/', ORG_ID, 1),
    );

    expect(result.pages.map((p) => p.url)).toEqual([
      'https://acme.test/',
      'https://acme.test/ok',
    ]);
    expect(result.failures).toEqual([]);
  });

  it('redacts URL query tokens and raw error text from skip logs', async () => {
    const retriever = fakeRetriever({
      'https://acme.test/': {
        links: ['https://acme.test/doc?token=SECRET123'],
      },
      // The linked doc is absent -> retriever rejects -> the page is skipped.
    });
    const useCase = await buildUseCase(retriever);
    const warnSpy = jest
      .spyOn(useCase['logger'], 'warn')
      .mockImplementation(() => undefined);

    await useCase.execute(new CrawlUrlCommand('https://acme.test/', ORG_ID, 1));

    expect(warnSpy).toHaveBeenCalledWith(
      {
        url: 'https://acme.test/doc',
        errorType: 'PROVIDER_NOT_AVAILABLE',
      },
      'Skipping page during crawl',
    );
  });

  it('propagates the error when the root page fails to fetch', async () => {
    const useCase = await buildUseCase(fakeRetriever({}));

    await expect(
      useCase.execute(new CrawlUrlCommand('https://acme.test/', ORG_ID, 1)),
    ).rejects.toThrow(UrlRetrieverProviderNotAvailableError);
  });

  it('clamps a requested depth above the maximum', async () => {
    const retriever = fakeRetriever({
      'https://acme.test/': { links: ['https://acme.test/a'] },
      'https://acme.test/a': { links: ['https://acme.test/b'] },
      'https://acme.test/b': { links: ['https://acme.test/c'] },
      'https://acme.test/c': { links: ['https://acme.test/d'] },
      'https://acme.test/d': {},
    });
    const useCase = await buildUseCase(retriever);

    const result = await useCase.execute(
      new CrawlUrlCommand('https://acme.test/', ORG_ID, 99),
    );

    // depth clamped to MAX_DEPTH (2): root -> a -> b, but not c/d.
    expect(result.pages.map((p) => p.url)).toEqual([
      'https://acme.test/',
      'https://acme.test/a',
      'https://acme.test/b',
    ]);
  });
});

describe('CrawlUrlUseCase failure reporting', () => {
  const root = 'https://acme.test/';

  it('reports a child page answering 503 or timing out as transiently failed and one answering 404 or 410 as gone', async () => {
    const links = ['a', 'b', 'c', 'd', 'e'].map((p) => `${root}${p}`);
    const retriever = failingRetriever(
      { [root]: { links }, [links[4]]: {} },
      {
        [links[0]]: new UrlRetrieverHttpError(links[0], 503),
        [links[1]]: new UrlRetrieverTimeoutError(links[1], 5000),
        [links[2]]: new UrlRetrieverHttpError(links[2], 404),
        [links[3]]: new UrlRetrieverHttpError(links[3], 410),
      },
    );
    const result = await (
      await buildUseCase(retriever)
    ).execute(new CrawlUrlCommand(root, ORG_ID, 1));

    expect(result.pages.map((p) => p.url)).toEqual([root, links[4]]);
    expect(result.failures).toEqual([
      { url: links[0], kind: UrlCrawlFailureKind.TRANSIENT },
      { url: links[1], kind: UrlCrawlFailureKind.TRANSIENT },
      { url: links[2], kind: UrlCrawlFailureKind.GONE },
      { url: links[3], kind: UrlCrawlFailureKind.GONE },
    ]);
  });

  it('reports a child page blocked mid-crawl (401, 403, 429, redirect loop, denied destination) as transiently failed, not gone', async () => {
    const failures: Record<string, Error> = {
      [`${root}login`]: new UrlRetrieverHttpError(`${root}login`, 401),
      [`${root}waf`]: new UrlRetrieverHttpError(`${root}waf`, 403),
      [`${root}limited`]: new UrlRetrieverHttpError(`${root}limited`, 429),
      [`${root}loop`]: new UrlRetrieverTooManyRedirectsError(`${root}loop`, 5),
      [`${root}moved`]: new CrawlDomainAccessDeniedError(),
    };
    const links = Object.keys(failures);
    const result = await (
      await buildUseCase(failingRetriever({ [root]: { links } }, failures))
    ).execute(new CrawlUrlCommand(root, ORG_ID, 1));

    expect(result.failures).toEqual(
      links.map((url) => ({ url, kind: UrlCrawlFailureKind.TRANSIENT })),
    );
  });

  it('does not report a page that was served but cannot be crawled as served', async () => {
    const image = `${root}logo.png`;
    const huge = `${root}archiv`;
    const broken = `${root}kaputt`;
    const retriever = failingRetriever(
      { [root]: { links: [image, huge, broken] } },
      {
        [image]: new UrlRetrieverUnsupportedContentTypeError(
          image,
          'image/png',
        ),
        [huge]: new UrlRetrieverContentTooLargeError(huge, 25 * 1024 * 1024),
        [broken]: new UrlRetrieverParsingError(broken, 'malformed markup'),
      },
    );
    const result = await (
      await buildUseCase(retriever)
    ).execute(new CrawlUrlCommand(root, ORG_ID, 1));

    expect(result.failures).toEqual([]);
  });

  it('still aborts the crawl when the root page answers 503', async () => {
    const retriever = failingRetriever(
      {},
      { [root]: new UrlRetrieverHttpError(root, 503) },
    );
    await expect(
      (await buildUseCase(retriever)).execute(
        new CrawlUrlCommand(root, ORG_ID, 1, {
          liftCaps: true,
          resolvePdfVersions: true,
        }),
      ),
    ).rejects.toBeInstanceOf(UrlRetrieverHttpError);
  });
});

describe('CrawlUrlUseCase with lifted caps', () => {
  const root = 'https://acme.test/';
  const children = Array.from({ length: 6 }, (_, i) => `${root}c${i}`);
  const grandchildren = children.flatMap((child) =>
    Array.from({ length: 6 }, (_, i) => `${child}/g${i}`),
  );
  const greatGrandchild = `${root}too-deep`;
  const pdfs = grandchildren.map(
    (url) => `https://cdn.test/${url.slice(18)}.pdf`,
  );
  const site = {
    [root]: { links: children },
    ...Object.fromEntries(
      children.map((child, i) => [
        child,
        { links: grandchildren.slice(i * 6, i * 6 + 6) },
      ]),
    ),
    ...Object.fromEntries(
      grandchildren.map((url, i) => [
        url,
        { links: [pdfs[i], greatGrandchild] },
      ]),
    ),
    [greatGrandchild]: {},
  };

  it('returns more than 25 pages and 25 PDFs of a depth-2 crawl, still bounded by the depth', async () => {
    const result = await (
      await buildUseCase(fakeRetriever(site))
    ).execute(new CrawlUrlCommand(root, ORG_ID, 2, { liftCaps: true }));

    expect(result.pages).toHaveLength(1 + 6 + 36);
    expect(result.pdfLinks).toHaveLength(36);
    expect(result.pages.map((p) => p.url)).not.toContain(greatGrandchild);
  });

  it('keeps the page and PDF caps when the caller does not lift them', async () => {
    const pdfVersions = { execute: jest.fn() };
    const result = await (
      await buildUseCase(fakeRetriever(site), pdfVersions)
    ).execute(new CrawlUrlCommand(root, ORG_ID, 2));

    expect(result.pages).toHaveLength(UrlCrawlConstants.MAX_PAGES);
    // One PDF per grandchild within the page cap: 25 - root - 6 children.
    expect(result.pdfLinks).toHaveLength(18);
    expect(result.pdfLinks.every((pdf) => pdf.version === undefined)).toBe(
      true,
    );
    expect(pdfVersions.execute).not.toHaveBeenCalled();
  });
});

describe('CrawlUrlUseCase PDF versions', () => {
  const root = 'https://acme.test/';
  const current = 'https://cdn.test/current.pdf';
  const unavailable = 'https://cdn.test/unavailable.pdf';
  const deleted = 'https://cdn.test/deleted.pdf';

  it('versions every PDF and reports PDFs whose version cannot be read as failed', async () => {
    const pdfVersions = {
      execute: jest.fn(({ url }: { url: string }) => {
        if (url === unavailable)
          return Promise.reject(new UrlRetrieverHttpError(url, 502));
        if (url === deleted)
          return Promise.reject(new UrlRetrieverHttpError(url, 404));
        return Promise.resolve('etag:"v7"');
      }),
    };
    const retriever = fakeRetriever({
      [root]: { links: [current, unavailable, deleted] },
    });
    const result = await (
      await buildUseCase(retriever, pdfVersions)
    ).execute(
      new CrawlUrlCommand(root, ORG_ID, 0, { resolvePdfVersions: true }),
    );

    expect(result.pdfLinks).toEqual([
      { url: current, name: 'current.pdf', version: 'etag:"v7"' },
    ]);
    expect(result.failures).toEqual([
      { url: unavailable, kind: UrlCrawlFailureKind.TRANSIENT },
      { url: deleted, kind: UrlCrawlFailureKind.GONE },
    ]);
  });
});
