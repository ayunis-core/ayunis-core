import { Appsignal } from '@appsignal/nodejs';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { DOCUMENT_PROCESSING_QUEUE } from 'src/domain/sources/infrastructure/queue/document-processing.constants';
import { DATA_SOURCE_PROCESSING_QUEUE } from 'src/domain/sources/infrastructure/queue/data-source-processing.constants';
import { URL_CRAWL_QUEUE } from 'src/domain/sources/infrastructure/queue/url-crawl.constants';
import { sampleQueueHealth } from './queue-health';

@Injectable()
export class QueueTelemetryService {
  private readonly logger = new Logger(QueueTelemetryService.name);
  private sampling = false;

  constructor(
    @InjectQueue(DOCUMENT_PROCESSING_QUEUE) private readonly documents: Queue,
    @InjectQueue(DATA_SOURCE_PROCESSING_QUEUE)
    private readonly dataSources: Queue,
    @InjectQueue(URL_CRAWL_QUEUE) private readonly urls: Queue,
  ) {}

  @Interval(30_000)
  async sample(): Promise<void> {
    const client = Appsignal.client as typeof Appsignal.client | undefined;
    if (this.sampling || !client?.isActive) return;
    this.sampling = true;
    try {
      for (const queue of [this.documents, this.dataSources, this.urls]) {
        try {
          await sampleQueueHealth(queue, client.metrics());
        } catch {
          this.logger.warn(
            { queue: queue.name },
            'Queue telemetry sample failed',
          );
        }
      }
    } finally {
      this.sampling = false;
    }
  }
}
