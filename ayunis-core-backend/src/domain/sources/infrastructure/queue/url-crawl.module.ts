import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { UrlCrawlProcessingPort } from 'src/domain/sources/application/ports/url-crawl-processing.port';
import { URL_CRAWL_QUEUE } from './url-crawl.constants';
import { UrlCrawlProducer } from './url-crawl.producer';

// Enqueue side only. The consumer lives in IngestionConsumersModule, so a
// process can add jobs without working through the queue.
@Module({
  imports: [OrgsModule, BullModule.registerQueue({ name: URL_CRAWL_QUEUE })],
  providers: [
    UrlCrawlProducer,
    { provide: UrlCrawlProcessingPort, useExisting: UrlCrawlProducer },
  ],
  exports: [UrlCrawlProcessingPort, BullModule],
})
export class UrlCrawlModule {}
