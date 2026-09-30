import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { SourceIngestionService } from 'src/domain/sources/application/services/source-ingestion.service';
import { UrlSourceExtractor } from 'src/domain/sources/application/services/url-source-extractor.service';
import type { UrlCrawlJobData } from 'src/domain/sources/application/ports/url-crawl-processing.port';
import { URL_CRAWL_QUEUE } from './url-crawl.constants';
import { classifyJobFailure } from './bullmq-job.helpers';

@Processor(URL_CRAWL_QUEUE, { concurrency: 2 })
export class UrlCrawlConsumer extends WorkerHost {
  private readonly logger = new Logger(UrlCrawlConsumer.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly ingestion: SourceIngestionService,
    private readonly urlSourceExtractor: UrlSourceExtractor,
  ) {
    super();
  }

  async process(job: Job<UrlCrawlJobData>): Promise<void> {
    const { sourceId, orgId, userId, rootUrl, maxDepth } = job.data;
    this.logger.log(
      { jobId: job.id, sourceId, url: rootUrl },
      'Crawling URL source',
    );

    await this.contextService.run(async () => {
      this.validateAndSetContext(orgId, userId);
      await this.ingestion.ingest({
        sourceId,
        orgId,
        extractor: this.urlSourceExtractor,
        input: { rootUrl, orgId, maxDepth },
        classifyFailure: (error) => classifyJobFailure(job, error),
      });
    });
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
}
