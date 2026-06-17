import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RetrieverModule } from 'src/domain/retrievers/retriever.module';
import { SplitterModule } from 'src/domain/rag/splitters/splitter.module';
import { IndexersModule } from 'src/domain/rag/indexers/indexers.module';
import { ContextModule } from 'src/common/context/context.module';
import { LocalSourceRepositoryModule } from '../persistence/local/local-source-repository.module';
import { MarkSourceFailedUseCase } from '../../application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { SourceProcessingHelper } from '../../application/services/source-processing-helper.service';
import { UrlCrawlProcessingPort } from '../../application/ports/url-crawl-processing.port';
import { URL_CRAWL_QUEUE } from './url-crawl.constants';
import { UrlCrawlProducer } from './url-crawl.producer';
import { UrlCrawlConsumer } from './url-crawl.consumer';

@Module({
  imports: [
    BullModule.registerQueue({
      name: URL_CRAWL_QUEUE,
    }),
    RetrieverModule,
    SplitterModule,
    IndexersModule,
    ContextModule,
    LocalSourceRepositoryModule,
  ],
  providers: [
    UrlCrawlProducer,
    {
      provide: UrlCrawlProcessingPort,
      useExisting: UrlCrawlProducer,
    },
    UrlCrawlConsumer,
    MarkSourceFailedUseCase,
    SourceProcessingHelper,
  ],
  exports: [UrlCrawlProcessingPort],
})
export class UrlCrawlModule {}
