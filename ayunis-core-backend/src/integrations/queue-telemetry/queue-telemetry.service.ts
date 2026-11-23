import { Appsignal } from '@appsignal/nodejs';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { DOCUMENT_PROCESSING_QUEUE } from 'src/domain/sources/infrastructure/queue/document-processing.constants';
import { DATA_SOURCE_PROCESSING_QUEUE } from 'src/domain/sources/infrastructure/queue/data-source-processing.constants';
import { URL_CRAWL_QUEUE } from 'src/domain/sources/infrastructure/queue/url-crawl.constants';
import { ROUTINE_EXECUTION_QUEUE } from 'src/domain/routines/infrastructure/queue/routine-execution.constants';
import { RECORDING_SUMMARY_QUEUE } from 'src/domain/recordings/infrastructure/queue/recording-summary.constants';
import { KNOWLEDGE_BASE_SYNC_QUEUE } from 'src/domain/knowledge-base-sync/infrastructure/queue/knowledge-base-sync.constants';
import { OPARL_SYNC_QUEUE } from 'src/domain/oparl/infrastructure/queue/oparl-sync.constants';
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
    @InjectQueue(ROUTINE_EXECUTION_QUEUE) private readonly routines: Queue,
    @InjectQueue(RECORDING_SUMMARY_QUEUE)
    private readonly recordingSummaries: Queue,
    @InjectQueue(KNOWLEDGE_BASE_SYNC_QUEUE) private readonly syncedFiles: Queue,
    @InjectQueue(OPARL_SYNC_QUEUE) private readonly oparlSyncs: Queue,
  ) {}

  @Interval(30_000)
  async sample(): Promise<void> {
    const client = Appsignal.client as typeof Appsignal.client | undefined;
    if (this.sampling || !client?.isActive) return;
    this.sampling = true;
    try {
      for (const queue of [
        this.documents,
        this.dataSources,
        this.urls,
        this.routines,
        this.recordingSummaries,
        this.syncedFiles,
        this.oparlSyncs,
      ]) {
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
