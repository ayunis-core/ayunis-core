import { UrlDestinationGuardService } from './infrastructure/url-destination-guard.service';
import { PdfExtractionCachePort } from './application/ports/pdf-extraction-cache.port';
import { RequestPdfExtractionCacheService } from './infrastructure/cache/request-pdf-extraction-cache.service';
import { Module } from '@nestjs/common';
import { CheerioUrlRetrieverHandler } from './infrastructure/cheerio.url-retriever';
import { UrlRetrieverHandler } from './application/ports/url-retriever.handler';
import { RetrieveUrlUseCase } from './application/use-cases/retrieve-url/retrieve-url.use-case';
import { CrawlUrlUseCase } from './application/use-cases/crawl-url/crawl-url.use-case';
import { CrawlDomainGrantsModule } from 'src/domain/crawl-domain-grants/crawl-domain-grants.module';
import { FileRetrieverModule } from 'src/domain/retrievers/file-retrievers/file-retriever.module';

@Module({
  imports: [CrawlDomainGrantsModule, FileRetrieverModule],
  providers: [
    UrlDestinationGuardService,
    {
      provide: UrlRetrieverHandler,
      useClass: CheerioUrlRetrieverHandler,
    },
    {
      provide: PdfExtractionCachePort,
      useClass: RequestPdfExtractionCacheService,
    },
    RetrieveUrlUseCase,
    CrawlUrlUseCase,
    CheerioUrlRetrieverHandler,
  ],
  exports: [RetrieveUrlUseCase, CrawlUrlUseCase],
})
export class UrlRetrieverModule {}
