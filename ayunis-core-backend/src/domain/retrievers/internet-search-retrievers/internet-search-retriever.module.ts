import { Module } from '@nestjs/common';
import { BraveInternetSearchHandler } from './infrastructure/handlers/brave-internet-search.handler';
import { SearchWebUseCase } from './application/use-cases/search-web/search-web.use-case';
import { InternetSearchHandler } from './application/ports/internet-search.handler';

@Module({
  providers: [
    {
      provide: InternetSearchHandler,
      useClass: BraveInternetSearchHandler,
    },
    BraveInternetSearchHandler,
    SearchWebUseCase,
  ],
  exports: [SearchWebUseCase],
})
export class InternetSearchRetrieverModule {}
