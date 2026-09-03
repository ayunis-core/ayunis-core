import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { CrawlUrlUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/crawl-url/crawl-url.use-case';
import { CrawlUrlCommand } from 'src/domain/retrievers/url-retrievers/application/use-cases/crawl-url/crawl-url.command';
import type { UrlCrawlResult } from 'src/domain/retrievers/url-retrievers/domain/url-crawl-result.entity';
import { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { SourceProcessingHelper } from 'src/domain/sources/application/services/source-processing-helper.service';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SplitterType } from 'src/domain/rag/splitters/domain/splitter-type.enum';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import type { UrlCrawlJobData } from 'src/domain/sources/application/ports/url-crawl-processing.port';
import { URL_CRAWL_QUEUE } from './url-crawl.constants';
import { classifyJobFailure } from './bullmq-job.helpers';

@Processor(URL_CRAWL_QUEUE, { concurrency: 2 })
export class UrlCrawlConsumer extends WorkerHost {
  private readonly logger = new Logger(UrlCrawlConsumer.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly crawlUrlUseCase: CrawlUrlUseCase,
    private readonly splitTextUseCase: SplitTextUseCase,
    private readonly sourceRepository: SourceRepository,
    private readonly helper: SourceProcessingHelper,
  ) {
    super();
  }

  async process(job: Job<UrlCrawlJobData>): Promise<void> {
    this.logger.log(
      {
        jobId: job.id,
        sourceId: job.data.sourceId,
        url: job.data.rootUrl,
      },
      'Crawling URL source',
    );
    await this.contextService.run(() => this.processCrawl(job));
  }

  private async processCrawl(job: Job<UrlCrawlJobData>): Promise<void> {
    const { sourceId, orgId, userId, rootUrl, maxDepth } = job.data;
    this.validateAndSetContext(orgId, userId);

    try {
      const source = await this.loadSourceOrSkip(sourceId);
      if (!source) return;

      const { text, chunks, title, pageCount } = await this.crawlAndBuild(
        rootUrl,
        orgId,
        maxDepth,
      );
      // Re-checking prevents a concurrent deletion from being resurrected.
      if (!(await this.isSourceStillProcessing(sourceId))) return;

      if (title) source.name = title;
      await this.sourceRepository.saveTextSource(source, { text, chunks });
      await this.helper.index(sourceId, orgId, chunks);
      await this.markSourceReady(sourceId);
      this.logger.log(
        { chunks: chunks.length, pages: pageCount, sourceId },
        'URL crawl complete',
      );
    } catch (error) {
      this.logger.error({ err: error as Error, sourceId }, 'URL crawl failed');
      const { final, rethrow } = classifyJobFailure(job, error);
      if (final) {
        await this.helper.markFailed(
          sourceId,
          error instanceof Error ? error.message : 'Unknown crawl error',
        );
        await this.helper.cleanupIndex(sourceId);
      }
      if (rethrow) throw rethrow;
    }
  }

  private validateAndSetContext(
    orgId: UUID | undefined,
    userId: UUID | undefined,
  ): void {
    if (!orgId) throw new Error('orgId is required');
    if (!userId) throw new Error('userId is required');
    this.contextService.set('orgId', orgId);
    this.contextService.set('userId', userId);
  }

  private async loadSourceOrSkip(sourceId: UUID): Promise<TextSource | null> {
    const source = await this.sourceRepository.findById(sourceId);
    if (!source) {
      this.logger.warn({ sourceId }, 'Source not found, skipping');
      return null;
    }
    if (!(source instanceof TextSource)) {
      throw new Error(`Source ${sourceId} is not a TextSource`);
    }

    // Reset processingStartedAt on every attempt so the stale-cleanup cron
    // doesn't race with BullMQ retries on long-running jobs.
    source.processingStartedAt = new Date();
    await this.sourceRepository.save(source);

    return source;
  }

  /** Crawl the root URL and split every page into chunks tagged with its URL. */
  private async crawlAndBuild(
    rootUrl: string,
    orgId: UUID,
    maxDepth: number,
  ): Promise<{
    text: string;
    chunks: TextSourceContentChunk[];
    title: string;
    pageCount: number;
  }> {
    const crawl: UrlCrawlResult = await this.crawlUrlUseCase.execute(
      new CrawlUrlCommand(rootUrl, orgId, maxDepth),
    );

    const chunks: TextSourceContentChunk[] = [];
    const texts: string[] = [];
    for (const page of crawl.pages) {
      texts.push(page.content);
      chunks.push(...this.chunkPage(page.url, page.content));
    }

    return {
      text: texts.join('\n\n'),
      chunks,
      title: crawl.rootPage.websiteTitle,
      pageCount: crawl.pages.length,
    };
  }

  private chunkPage(url: string, content: string): TextSourceContentChunk[] {
    const split = this.splitTextUseCase.execute(
      new SplitTextCommand(content, SplitterType.RECURSIVE, {
        chunkSize: 2000,
        chunkOverlap: 200,
      }),
    );
    return split.chunks.map(
      (chunk) =>
        new TextSourceContentChunk({
          content: chunk.text,
          meta: { url, ...chunk.metadata },
        }),
    );
  }

  private async isSourceStillProcessing(sourceId: UUID): Promise<boolean> {
    const source = await this.sourceRepository.findById(sourceId);
    if (source?.status !== SourceStatus.PROCESSING) {
      this.logger.warn(
        {
          sourceId,
          found: !!source,
        },
        'Source deleted or status changed mid-crawl',
      );
      return false;
    }
    return true;
  }

  private async markSourceReady(sourceId: UUID): Promise<void> {
    const updated = await this.sourceRepository.updateStatusConditionally(
      sourceId,
      SourceStatus.PROCESSING,
      SourceStatus.READY,
      { processingError: null },
    );
    if (!updated) {
      this.logger.warn(
        { sourceId },
        'Conditional update to READY failed — source was deleted or status changed',
      );
      await this.helper.cleanupIndex(sourceId);
    }
  }
}
