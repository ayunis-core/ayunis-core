import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DOCUMENT_PROCESSING_QUEUE } from 'src/domain/sources/infrastructure/queue/document-processing.constants';
import { DATA_SOURCE_PROCESSING_QUEUE } from 'src/domain/sources/infrastructure/queue/data-source-processing.constants';
import { URL_CRAWL_QUEUE } from 'src/domain/sources/infrastructure/queue/url-crawl.constants';
import { QueueTelemetryService } from './queue-telemetry.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: DOCUMENT_PROCESSING_QUEUE },
      { name: DATA_SOURCE_PROCESSING_QUEUE },
      { name: URL_CRAWL_QUEUE },
    ),
  ],
  providers: [QueueTelemetryService],
})
export class QueueTelemetryModule {}
