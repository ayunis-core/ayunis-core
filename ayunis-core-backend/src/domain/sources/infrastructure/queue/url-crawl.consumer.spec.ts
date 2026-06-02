import type { UUID } from 'crypto';
import type { Job } from 'bullmq';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import {
  UrlCrawlPage,
  UrlCrawlResult,
} from 'src/domain/retrievers/url-retrievers/domain/url-crawl-result.entity';
import type { UrlCrawlJobData } from '../../application/ports/url-crawl-processing.port';
import { UrlCrawlConsumer } from './url-crawl.consumer';

const SOURCE_ID = '00000000-0000-0000-0000-000000000001' as UUID;
const ORG_ID = '00000000-0000-0000-0000-000000000010' as UUID;
const USER_ID = '00000000-0000-0000-0000-000000000020' as UUID;

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

const splitTextUseCase = {
  execute: jest.fn((command: { text: string }) => ({
    chunks: [{ text: command.text, metadata: { start: 0 } }],
  })),
};

const sourceRepository = {
  findById: jest.fn(),
  save: jest.fn().mockImplementation((s: unknown) => Promise.resolve(s)),
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
});
