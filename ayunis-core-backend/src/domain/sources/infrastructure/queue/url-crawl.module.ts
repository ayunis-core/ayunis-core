import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RetrieverModule } from 'src/domain/retrievers/retriever.module';
import { SplitterModule } from 'src/domain/rag/splitters/splitter.module';
import { IndexersModule } from 'src/domain/rag/indexers/indexers.module';
import { ContextModule } from 'src/common/context/context.module';
import { LocalSourceRepositoryModule } from 'src/domain/sources/infrastructure/persistence/local/local-source-repository.module';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { SourceProcessingHelper } from 'src/domain/sources/application/services/source-processing-helper.service';
import { SourceContentReplacementService } from 'src/domain/sources/application/services/source-content-replacement.service';
import { SourceIngestionService } from 'src/domain/sources/application/services/source-ingestion.service';
import { SourceContentDegradationGuard } from 'src/domain/sources/application/services/source-content-degradation-guard.service';
import { UrlSourceExtractor } from 'src/domain/sources/application/services/url-source-extractor.service';
import { UrlCrawlProcessingPort } from 'src/domain/sources/application/ports/url-crawl-processing.port';
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
    SourceContentReplacementService,
    SourceIngestionService,
    SourceContentDegradationGuard,
    UrlSourceExtractor,
  ],
  exports: [UrlCrawlProcessingPort],
})
export class UrlCrawlModule {}
