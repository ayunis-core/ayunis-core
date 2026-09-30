import type { UUID } from 'crypto';

// p-limit is ESM-only — mock the dynamic import so Jest (CJS) doesn't choke.
// (Pulled in transitively via UrlSourceExtractor → CrawlUrlUseCase.)
jest.mock('p-limit', () => ({
  __esModule: true,
  default:
    () =>
    <T>(fn: () => T) =>
      fn(),
}));

import type { CrawlUrlCommand } from 'src/domain/retrievers/url-retrievers/application/use-cases/crawl-url/crawl-url.command';
import {
  UrlCrawlPage,
  UrlCrawlResult,
} from 'src/domain/retrievers/url-retrievers/domain/url-crawl-result.entity';
import type { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import {
  UrlSourceExtractor,
  type UrlSourceInput,
} from './url-source-extractor.service';

const ORG_ID = '00000000-0000-0000-0000-000000000010' as UUID;
const INPUT: UrlSourceInput = {
  rootUrl: 'https://acme.test/',
  orgId: ORG_ID,
  maxDepth: 1,
};

interface MockSplitResult {
  chunks: { text: string; metadata: Record<string, unknown> }[];
}

describe('UrlSourceExtractor', () => {
  let crawlUrlUseCase: {
    execute: jest.Mock<Promise<UrlCrawlResult>, [CrawlUrlCommand]>;
  };
  let splitTextUseCase: {
    execute: jest.Mock<MockSplitResult, [SplitTextCommand]>;
  };
  let extractor: UrlSourceExtractor;

  beforeEach(() => {
    crawlUrlUseCase = {
      execute: jest.fn<Promise<UrlCrawlResult>, [CrawlUrlCommand]>(
        async () =>
          new UrlCrawlResult([
            new UrlCrawlPage('https://acme.test/', 'root content', 'Acme Home'),
            new UrlCrawlPage(
              'https://acme.test/about',
              'about content',
              'About',
            ),
          ]),
      ),
    };
    splitTextUseCase = {
      execute: jest.fn((command: SplitTextCommand) => ({
        chunks: [{ text: command.text, metadata: { start: 0 } }],
      })),
    };
    extractor = new UrlSourceExtractor(
      crawlUrlUseCase as never,
      splitTextUseCase as never,
    );
  });

  it('crawls the root url for the org up to the requested depth', async () => {
    await extractor.extract(INPUT);

    expect(crawlUrlUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://acme.test/',
        orgId: ORG_ID,
        maxDepth: 1,
      }),
    );
  });

  it('aggregates crawled pages and tags each chunk with its origin url', async () => {
    const extracted = await extractor.extract(INPUT);

    expect(extracted.text).toBe('root content\n\nabout content');
    expect(extracted.chunks.map((chunk) => chunk.meta.url)).toEqual([
      'https://acme.test/',
      'https://acme.test/about',
    ]);
  });

  it('stores chunk offsets in the concatenated source coordinate space', async () => {
    const rootContent = 'Overview line 1\nOverview line 2\n';
    const documentContent = 'Policy heading\nPolicy answer';
    crawlUrlUseCase.execute.mockResolvedValueOnce(
      new UrlCrawlResult([
        new UrlCrawlPage('https://acme.test/', rootContent, 'Acme Home'),
        new UrlCrawlPage(
          'https://acme.test/policy.pdf',
          documentContent,
          'Policy',
        ),
      ]),
    );
    splitTextUseCase.execute
      .mockReturnValueOnce({
        chunks: [
          {
            text: rootContent,
            metadata: {
              startCharOffset: 0,
              endCharOffset: rootContent.length,
              startLine: 1,
              endLine: 2,
            },
          },
        ],
      })
      .mockReturnValueOnce({
        chunks: [
          {
            text: documentContent,
            metadata: {
              startCharOffset: 0,
              endCharOffset: documentContent.length,
              startLine: 1,
              endLine: 2,
            },
          },
        ],
      });

    const extracted = await extractor.extract(INPUT);

    expect(extracted.text).toBe(`${rootContent}\n\n${documentContent}`);
    expect(extracted.chunks[0].meta).toMatchObject({
      startCharOffset: 0,
      endCharOffset: rootContent.length,
      startLine: 1,
      endLine: 2,
    });
    expect(extracted.chunks[1].meta).toMatchObject({
      url: 'https://acme.test/policy.pdf',
      startCharOffset: rootContent.length + 2,
      endCharOffset: rootContent.length + 2 + documentContent.length,
      startLine: 5,
      endLine: 6,
    });
  });

  it("names the source after the root page's title", async () => {
    const extracted = await extractor.extract(INPUT);

    expect(extracted.name).toBe('Acme Home');
  });
});
