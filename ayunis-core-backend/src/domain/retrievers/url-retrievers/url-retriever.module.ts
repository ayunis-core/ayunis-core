import { Module } from '@nestjs/common';
import { CheerioUrlRetrieverHandler } from './infrastructure/cheerio.url-retriever';
import { UrlRetrieverHandler } from './application/ports/url-retriever.handler';
import { UrlRetrieverController } from './presenter/http/url-retriever.controller';
import { RetrieveUrlUseCase } from './application/use-cases/retrieve-url/retrieve-url.use-case';

@Module({
  providers: [
    {
      provide: UrlRetrieverHandler,
      useClass: CheerioUrlRetrieverHandler,
    },
    RetrieveUrlUseCase,
    CheerioUrlRetrieverHandler,
  ],
  controllers: [UrlRetrieverController],
  exports: [RetrieveUrlUseCase],
})
export class UrlRetrieverModule {}
