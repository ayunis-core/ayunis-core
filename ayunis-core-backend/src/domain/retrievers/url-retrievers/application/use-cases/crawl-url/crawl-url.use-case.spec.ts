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
import { RetrieveUrlUseCase } from '../retrieve-url/retrieve-url.use-case';
import { UrlRetrieverResult } from 'src/domain/retrievers/url-retrievers/domain/url-retriever-result.entity';
import { UrlCrawlConstants } from 'src/domain/retrievers/url-retrievers/domain/url-crawl.constants';
import { UrlRetrieverProviderNotAvailableError } from '../../url-retriever.errors';

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
): Promise<CrawlUrlUseCase> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CrawlUrlUseCase,
      { provide: RetrieveUrlUseCase, useValue: retriever },
    ],
  }).compile();
  return module.get(CrawlUrlUseCase);
}

describe('CrawlUrlUseCase', () => {
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

    expect(result.pages.length).toBe(UrlCrawlConstants.MAX_PAGES);
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
    expect(result.pages.length).toBe(UrlCrawlConstants.MAX_PAGES);
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
    expect(result.pages.length).toBe(2);
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

    const logged = warnSpy.mock.calls.map((call) => String(call[0])).join('\n');
    expect(logged).toContain('Skipping page during crawl');
    expect(logged).toContain('https://acme.test/doc'); // redacted path retained
    expect(logged).not.toContain('SECRET123'); // signed token dropped
    expect(logged).not.toContain('token=');
    expect(logged).toContain('PROVIDER_NOT_AVAILABLE'); // stable code, not raw msg
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
