import { Module } from '@nestjs/common';
import { CheerioUrlRetrieverHandler } from './infrastructure/cheerio.url-retriever';
import { UrlRetrieverHandler } from './application/ports/url-retriever.handler';
import { RetrieveUrlUseCase } from './application/use-cases/retrieve-url/retrieve-url.use-case';
import { CrawlUrlUseCase } from './application/use-cases/crawl-url/crawl-url.use-case';
import { CrawlDomainGrantsModule } from 'src/domain/crawl-domain-grants/crawl-domain-grants.module';
import { FileRetrieverModule } from '../file-retrievers/file-retriever.module';

@Module({
  imports: [CrawlDomainGrantsModule, FileRetrieverModule],
  providers: [
    {
      provide: UrlRetrieverHandler,
      useClass: CheerioUrlRetrieverHandler,
    },
    RetrieveUrlUseCase,
    CrawlUrlUseCase,
    CheerioUrlRetrieverHandler,
  ],
  exports: [RetrieveUrlUseCase, CrawlUrlUseCase],
})
export class UrlRetrieverModule {}
