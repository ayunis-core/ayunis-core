import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { UUID } from 'crypto';
import {
  UrlCrawlProcessingPort,
  type UrlCrawlJobData,
} from '../../application/ports/url-crawl-processing.port';
import { URL_CRAWL_QUEUE } from './url-crawl.constants';
import { STANDARD_JOB_OPTIONS, cancelQueueJob } from './bullmq-job.helpers';

@Injectable()
export class UrlCrawlProducer extends UrlCrawlProcessingPort {
  private readonly logger = new Logger(UrlCrawlProducer.name);

  constructor(
    @InjectQueue(URL_CRAWL_QUEUE)
    private readonly queue: Queue<UrlCrawlJobData>,
  ) {
    super();
  }

  async enqueue(data: UrlCrawlJobData): Promise<void> {
    this.logger.log('Enqueuing URL crawl job', {
      sourceId: data.sourceId,
      rootUrl: data.rootUrl,
      maxDepth: data.maxDepth,
    });

    await this.queue.add('crawl-url', data, {
      jobId: data.sourceId,
      ...STANDARD_JOB_OPTIONS,
    });
  }

  async cancelJob(sourceId: UUID): Promise<void> {
    await cancelQueueJob(this.queue, sourceId, this.logger);
  }
}
