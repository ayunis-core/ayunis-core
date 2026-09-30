import type { UUID } from 'crypto';
import type { Job } from 'bullmq';

// p-limit is ESM-only — mock the dynamic import so Jest (CJS) doesn't choke.
// (Pulled in transitively via UrlCrawlConsumer → CrawlUrlUseCase.)
jest.mock('p-limit', () => ({
  __esModule: true,
  default:
    () =>
    <T>(fn: () => T) =>
      fn(),
}));

import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import {
  UrlCrawlPage,
  UrlCrawlResult,
} from 'src/domain/retrievers/url-retrievers/domain/url-crawl-result.entity';
import {
  UrlRetrieverTimeoutError,
  UrlRetrieverUnsupportedContentTypeError,
} from 'src/domain/retrievers/url-retrievers/application/url-retriever.errors';
import type { UrlCrawlJobData } from 'src/domain/sources/application/ports/url-crawl-processing.port';
import { UrlCrawlConsumer } from './url-crawl.consumer';

const SOURCE_ID = '00000000-0000-0000-0000-000000000001' as UUID;
const ORG_ID = '00000000-0000-0000-0000-000000000010' as UUID;
const USER_ID = '00000000-0000-0000-0000-000000000020' as UUID;
const KNOWLEDGE_BASE_ID = '00000000-0000-0000-0000-000000000030' as UUID;

function makeJobData(): UrlCrawlJobData {
  return {
    sourceId: SOURCE_ID,
    orgId: ORG_ID,
    userId: USER_ID,
    rootUrl: 'https://acme.test/',
    maxDepth: 1,
  };
}

function makeSource(status = SourceStatus.PROCESSING): UrlSource {
  return new UrlSource({
    id: SOURCE_ID,
    name: 'acme.test',
    type: TextType.WEB,
    url: 'https://acme.test/',
    maxDepth: 1,
    knowledgeBaseId: null,
    status,
    processingStartedAt: new Date(),
  });
}

function makeJob(): Job<UrlCrawlJobData> {
  return {
    data: makeJobData(),
    id: 'job-1',
    attemptsMade: 0,
    opts: { attempts: 3 },
  } as unknown as Job<UrlCrawlJobData>;
}

const contextService = {
  run: jest.fn((fn: () => Promise<void>) => fn()),
  set: jest.fn(),
};

const crawlUrlUseCase = {
  execute: jest
    .fn()
    .mockResolvedValue(
      new UrlCrawlResult([
        new UrlCrawlPage('https://acme.test/', 'root content', 'Acme Home'),
        new UrlCrawlPage('https://acme.test/about', 'about content', 'About'),
      ]),
    ),
};

interface MockSplitResult {
  chunks: { text: string; metadata: Record<string, unknown> }[];
}

const splitTextUseCase = {
  execute: jest.fn<MockSplitResult, [{ text: string }]>((command) => ({
    chunks: [{ text: command.text, metadata: { start: 0 } }],
  })),
};

const sourceRepository = {
  findById: jest.fn(),
  save: jest.fn().mockImplementation((s: unknown) => Promise.resolve(s)),
  refreshProcessingHeartbeat: jest.fn().mockResolvedValue(true),
  saveTextSource: jest
    .fn()
    .mockImplementation((s: unknown) => Promise.resolve(s)),
  updateStatusConditionally: jest.fn(),
};

const indexer = {
  index: jest.fn().mockResolvedValue(undefined),
  cleanupIndex: jest.fn().mockResolvedValue(undefined),
  markFailed: jest.fn().mockResolvedValue(undefined),
};

describe('UrlCrawlConsumer', () => {
  let consumer: UrlCrawlConsumer;

  beforeEach(() => {
    jest.clearAllMocks();
    consumer = new UrlCrawlConsumer(
      contextService as never,
      crawlUrlUseCase as never,
      splitTextUseCase as never,
      sourceRepository as never,
      indexer as never,
    );
  });

  it('aggregates crawled pages and tags each chunk with its origin url', async () => {
    const source = makeSource();
    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);

    await consumer.process(makeJob());

    const [, content] = sourceRepository.saveTextSource.mock.calls[0];
    expect(content.text).toBe('root content\n\nabout content');
    expect(
      content.chunks.map((c: { meta: { url: string } }) => c.meta.url),
    ).toEqual(['https://acme.test/', 'https://acme.test/about']);
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
    sourceRepository.findById.mockResolvedValue(makeSource());
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);

    await consumer.process(makeJob());

    const [, content] = sourceRepository.saveTextSource.mock.calls[0];
    expect(content.text).toBe(`${rootContent}\n\n${documentContent}`);
    expect(content.chunks[0].meta).toMatchObject({
      startCharOffset: 0,
      endCharOffset: rootContent.length,
      startLine: 1,
      endLine: 2,
    });
    expect(content.chunks[1].meta).toMatchObject({
      url: 'https://acme.test/policy.pdf',
      startCharOffset: rootContent.length + 2,
      endCharOffset: rootContent.length + 2 + documentContent.length,
      startLine: 5,
      endLine: 6,
    });
  });

  it("updates the source name to the root page's title", async () => {
    const source = makeSource();
    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);

    await consumer.process(makeJob());

    const [savedSource] = sourceRepository.saveTextSource.mock.calls[0];
    expect(savedSource.name).toBe('Acme Home');
  });

  it('marks the source ready after a successful crawl', async () => {
    const source = makeSource();
    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);

    await consumer.process(makeJob());

    expect(sourceRepository.updateStatusConditionally).toHaveBeenCalledWith(
      SOURCE_ID,
      SourceStatus.PROCESSING,
      SourceStatus.READY,
      { processingError: null },
    );
  });

  it('refreshes the heartbeat with a targeted update instead of saving the loaded record', async () => {
    sourceRepository.findById.mockResolvedValue(makeSource());
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);

    await consumer.process(makeJob());

    expect(sourceRepository.refreshProcessingHeartbeat).toHaveBeenCalledWith(
      SOURCE_ID,
    );
    expect(sourceRepository.save).not.toHaveBeenCalled();
  });

  it('writes content against the freshly loaded source so a collection assigned after the load is kept', async () => {
    const assigned = makeSource();
    assigned.knowledgeBaseId = KNOWLEDGE_BASE_ID;
    // AddUrlToKnowledgeBase assigns the collection right after enqueueing, so
    // the worker's first read may predate it.
    sourceRepository.findById
      .mockResolvedValueOnce(makeSource())
      .mockResolvedValueOnce(assigned);
    sourceRepository.updateStatusConditionally.mockResolvedValue(true);

    await consumer.process(makeJob());

    const [savedSource] = sourceRepository.saveTextSource.mock.calls[0];
    expect(savedSource.knowledgeBaseId).toBe(KNOWLEDGE_BASE_ID);
    expect(savedSource.name).toBe('Acme Home');
  });

  it('skips the crawl when the heartbeat finds the source gone or no longer processing', async () => {
    sourceRepository.findById.mockResolvedValue(makeSource());
    sourceRepository.refreshProcessingHeartbeat.mockResolvedValueOnce(false);

    await consumer.process(makeJob());

    expect(crawlUrlUseCase.execute).not.toHaveBeenCalled();
    expect(sourceRepository.saveTextSource).not.toHaveBeenCalled();
  });

  it('skips writing content when the source is deleted mid-crawl', async () => {
    const source = makeSource();
    // load returns the source; the still-processing guard returns null.
    sourceRepository.findById
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce(null);

    await consumer.process(makeJob());

    expect(sourceRepository.saveTextSource).not.toHaveBeenCalled();
    expect(sourceRepository.updateStatusConditionally).not.toHaveBeenCalled();
  });

  it('marks the source failed on the last attempt when the crawl throws', async () => {
    const source = makeSource();
    sourceRepository.findById.mockResolvedValue(source);
    crawlUrlUseCase.execute.mockRejectedValueOnce(
      new Error('root unreachable'),
    );

    const job = {
      data: makeJobData(),
      id: 'job-1',
      attemptsMade: 2,
      opts: { attempts: 3 },
    } as unknown as Job<UrlCrawlJobData>;

    await expect(consumer.process(job)).rejects.toThrow('root unreachable');
    expect(indexer.markFailed).toHaveBeenCalled();
  });

  it('rethrows as JobRetryScheduledError when retries remain, so AppSignal ignores the attempt', async () => {
    const source = makeSource();
    sourceRepository.findById.mockResolvedValue(source);
    crawlUrlUseCase.execute.mockRejectedValueOnce(
      new Error('root unreachable'),
    );

    const job = {
      data: makeJobData(),
      id: 'job-1',
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as unknown as Job<UrlCrawlJobData>;

    await expect(consumer.process(job)).rejects.toMatchObject({
      name: 'JobRetryScheduledError',
      message: 'root unreachable',
    });
    expect(indexer.markFailed).not.toHaveBeenCalled();
  });

  it('completes without throwing when the crawl fails for a user-caused reason', async () => {
    const source = makeSource();
    sourceRepository.findById.mockResolvedValue(source);
    crawlUrlUseCase.execute.mockRejectedValueOnce(
      new UrlRetrieverUnsupportedContentTypeError(
        'https://acme.test/',
        'application/zip',
      ),
    );

    const job = {
      data: makeJobData(),
      id: 'job-1',
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as unknown as Job<UrlCrawlJobData>;

    // Completing rather than throwing is what keeps it out of AppSignal.
    await expect(consumer.process(job)).resolves.toBeUndefined();
    expect(indexer.markFailed).toHaveBeenCalled();
    expect(indexer.cleanupIndex).toHaveBeenCalled();
  });

  it('still retries a crawl timeout, which may succeed on a later attempt', async () => {
    const source = makeSource();
    sourceRepository.findById.mockResolvedValue(source);
    crawlUrlUseCase.execute.mockRejectedValueOnce(
      new UrlRetrieverTimeoutError('https://acme.test/', 5000),
    );

    const job = {
      data: makeJobData(),
      id: 'job-1',
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as unknown as Job<UrlCrawlJobData>;

    await expect(consumer.process(job)).rejects.toMatchObject({
      name: 'JobRetryScheduledError',
    });
    expect(indexer.markFailed).not.toHaveBeenCalled();
  });
});
