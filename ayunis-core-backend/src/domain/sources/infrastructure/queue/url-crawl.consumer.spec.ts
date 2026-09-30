import type { UUID } from 'crypto';
import type { Job } from 'bullmq';

// p-limit is ESM-only — mock the dynamic import so Jest (CJS) doesn't choke.
// (Pulled in transitively via UrlSourceExtractor → CrawlUrlUseCase.)
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
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import type { UrlCrawlJobData } from 'src/domain/sources/application/ports/url-crawl-processing.port';
import { SourceIngestionKind } from 'src/domain/sources/application/models/source-ingestion-kind.enum';
import { createMockSourceRepository } from 'src/domain/sources/application/testing/source.fixtures';
import { SourceIngestionService } from 'src/domain/sources/application/services/source-ingestion.service';
import { SourceContentDegradationGuard } from 'src/domain/sources/application/services/source-content-degradation-guard.service';
import { UrlSourceExtractor } from 'src/domain/sources/application/services/url-source-extractor.service';
import { UrlCrawlConsumer } from './url-crawl.consumer';

const SOURCE_ID = '00000000-0000-0000-0000-000000000001' as UUID;
const ORG_ID = '00000000-0000-0000-0000-000000000010' as UUID;
const USER_ID = '00000000-0000-0000-0000-000000000020' as UUID;

function makeJob(
  attemptsMade = 0,
  kind?: SourceIngestionKind,
): Job<UrlCrawlJobData> {
  return {
    data: {
      sourceId: SOURCE_ID,
      orgId: ORG_ID,
      userId: USER_ID,
      rootUrl: 'https://acme.test/',
      maxDepth: 1,
      ...(kind ? { kind } : {}),
    },
    id: '42',
    attemptsMade,
    opts: { attempts: 3 },
  } as unknown as Job<UrlCrawlJobData>;
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

describe('UrlCrawlConsumer', () => {
  const contextService = {
    run: jest.fn((fn: () => Promise<void>) => fn()),
    set: jest.fn(),
  };
  const crawlUrlUseCase = { execute: jest.fn() };
  const splitTextUseCase = {
    execute: jest.fn((command: { text: string }) => ({
      chunks: [{ text: command.text, metadata: { start: 0 } }],
    })),
  };
  const contentReplacement = {
    prepare: jest.fn(
      async (params: {
        sourceId: UUID;
        text: string;
        chunks: TextSourceContentChunk[];
      }) => ({
        text: params.text,
        chunks: params.chunks,
        index: { documentId: params.sourceId },
      }),
    ),
    commit: jest.fn<
      Promise<UrlSource | null>,
      [UrlSource, { text: string; chunks: TextSourceContentChunk[] }]
    >(async (source) => source),
  };
  const helper = {
    cleanupIndex: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn().mockResolvedValue(undefined),
  };
  let sourceRepository: ReturnType<typeof createMockSourceRepository>;
  let consumer: UrlCrawlConsumer;

  beforeEach(() => {
    jest.clearAllMocks();
    crawlUrlUseCase.execute.mockResolvedValue(
      new UrlCrawlResult([
        new UrlCrawlPage('https://acme.test/', 'root content', 'Acme Home'),
        new UrlCrawlPage('https://acme.test/about', 'about content', 'About'),
      ]),
    );
    sourceRepository = createMockSourceRepository();
    sourceRepository.findById.mockResolvedValue(makeSource());

    consumer = new UrlCrawlConsumer(
      contextService as never,
      new SourceIngestionService(
        sourceRepository,
        contentReplacement as never,
        helper as never,
        new SourceContentDegradationGuard(sourceRepository),
      ),
      new UrlSourceExtractor(
        crawlUrlUseCase as never,
        splitTextUseCase as never,
      ),
    );
  });

  it('crawls the job root url in the job owner context and marks the source ready, treating a job without a run kind as the initial run', async () => {
    await consumer.process(makeJob());

    expect(contextService.set).toHaveBeenCalledWith('orgId', ORG_ID);
    expect(contextService.set).toHaveBeenCalledWith('userId', USER_ID);
    expect(crawlUrlUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://acme.test/',
        orgId: ORG_ID,
        maxDepth: 1,
      }),
    );
    const [committed, content] = contentReplacement.commit.mock.calls[0];
    expect(committed.name).toBe('Acme Home');
    expect(content.text).toBe('root content\n\nabout content');
    expect(sourceRepository.updateStatusConditionally).toHaveBeenCalledWith(
      SOURCE_ID,
      SourceStatus.PROCESSING,
      SourceStatus.READY,
      { processingError: null, lastIndexedAt: expect.any(Date) },
    );
  });

  it('marks the source failed on the last attempt when the crawl throws', async () => {
    crawlUrlUseCase.execute.mockRejectedValueOnce(
      new Error('root unreachable'),
    );

    await expect(consumer.process(makeJob(2))).rejects.toThrow(
      'root unreachable',
    );
    expect(helper.markFailed).toHaveBeenCalled();
    expect(helper.cleanupIndex).toHaveBeenCalledWith(SOURCE_ID);
  });

  it('rethrows as JobRetryScheduledError when retries remain, so AppSignal ignores the attempt', async () => {
    crawlUrlUseCase.execute.mockRejectedValueOnce(
      new Error('root unreachable'),
    );

    await expect(consumer.process(makeJob())).rejects.toMatchObject({
      name: 'JobRetryScheduledError',
      message: 'root unreachable',
    });
    expect(helper.markFailed).not.toHaveBeenCalled();
  });

  it('completes without throwing when the crawl fails for a user-caused reason', async () => {
    crawlUrlUseCase.execute.mockRejectedValueOnce(
      new UrlRetrieverUnsupportedContentTypeError(
        'https://acme.test/',
        'application/zip',
      ),
    );

    // Completing rather than throwing is what keeps it out of AppSignal.
    await expect(consumer.process(makeJob())).resolves.toBeUndefined();
    expect(helper.markFailed).toHaveBeenCalled();
    expect(helper.cleanupIndex).toHaveBeenCalled();
  });

  it('still retries a crawl timeout, which may succeed on a later attempt', async () => {
    crawlUrlUseCase.execute.mockRejectedValueOnce(
      new UrlRetrieverTimeoutError('https://acme.test/', 5000),
    );

    await expect(consumer.process(makeJob())).rejects.toMatchObject({
      name: 'JobRetryScheduledError',
    });
    expect(helper.markFailed).not.toHaveBeenCalled();
  });

  describe('re-index job', () => {
    beforeEach(() => {
      sourceRepository.findById.mockResolvedValue(
        makeSource(SourceStatus.READY),
      );
    });

    it('replaces the content of the ready source without changing its status', async () => {
      await consumer.process(makeJob(0, SourceIngestionKind.REINDEX));

      const [committed] = contentReplacement.commit.mock.calls[0];
      expect(committed.status).toBe(SourceStatus.READY);
      expect(committed.lastIndexedAt).toBeInstanceOf(Date);
      expect(sourceRepository.updateStatusConditionally).not.toHaveBeenCalled();
    });

    it('records the failed run on the last attempt instead of failing the source', async () => {
      crawlUrlUseCase.execute.mockRejectedValueOnce(
        new Error('root unreachable'),
      );

      await expect(
        consumer.process(makeJob(2, SourceIngestionKind.REINDEX)),
      ).rejects.toThrow('root unreachable');
      expect(sourceRepository.recordRunFailure).toHaveBeenCalledWith(
        SOURCE_ID,
        expect.objectContaining({ error: 'root unreachable' }),
      );
      expect(helper.markFailed).not.toHaveBeenCalled();
      expect(helper.cleanupIndex).not.toHaveBeenCalled();
    });

    it('runs a scheduled re-index without a requesting user in the org context alone', async () => {
      const job = makeJob(0, SourceIngestionKind.REINDEX);
      delete (job.data as Partial<UrlCrawlJobData>).userId;

      await consumer.process(job);

      expect(contextService.set).toHaveBeenCalledWith('orgId', ORG_ID);
      expect(contextService.set).not.toHaveBeenCalledWith(
        'userId',
        expect.anything(),
      );
      expect(contentReplacement.commit).toHaveBeenCalled();
    });
  });

  it('still rejects an initial crawl without a requesting user', async () => {
    const job = makeJob();
    delete (job.data as Partial<UrlCrawlJobData>).userId;

    await expect(consumer.process(job)).rejects.toThrow('userId is required');
    expect(crawlUrlUseCase.execute).not.toHaveBeenCalled();
  });
});
