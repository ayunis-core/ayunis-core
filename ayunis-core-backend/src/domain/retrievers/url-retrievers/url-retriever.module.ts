import { Module } from '@nestjs/common';
import { CheerioUrlRetrieverHandler } from './infrastructure/cheerio.url-retriever';
import { UrlRetrieverHandler } from './application/ports/url-retriever.handler';
import { RetrieveUrlUseCase } from './application/use-cases/retrieve-url/retrieve-url.use-case';
import { CrawlDomainGrantsModule } from 'src/domain/crawl-domain-grants/crawl-domain-grants.module';

@Module({
  imports: [CrawlDomainGrantsModule],
  providers: [
    {
      provide: UrlRetrieverHandler,
      useClass: CheerioUrlRetrieverHandler,
    },
    RetrieveUrlUseCase,
    CheerioUrlRetrieverHandler,
  ],
  exports: [RetrieveUrlUseCase],
})
export class UrlRetrieverModule {}
