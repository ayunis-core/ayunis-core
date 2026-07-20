import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BraveInternetSearchHandler } from './infrastructure/handlers/brave-internet-search.handler';
import { StaanInternetSearchHandler } from './infrastructure/handlers/staan-internet-search.handler';
import { SearchWebUseCase } from './application/use-cases/search-web/search-web.use-case';
import { InternetSearchHandler } from './application/ports/internet-search.handler';

@Module({
  providers: [
    BraveInternetSearchHandler,
    StaanInternetSearchHandler,
    {
      // Provider selected by the INTERNET_SEARCH_PROVIDER env var (default brave).
      provide: InternetSearchHandler,
      inject: [
        ConfigService,
        BraveInternetSearchHandler,
        StaanInternetSearchHandler,
      ],
      useFactory: (
        configService: ConfigService,
        brave: BraveInternetSearchHandler,
        staan: StaanInternetSearchHandler,
      ): InternetSearchHandler =>
        configService.get<string>('internetSearch.provider') === 'staan'
          ? staan
          : brave,
    },
    SearchWebUseCase,
  ],
  exports: [SearchWebUseCase],
})
export class InternetSearchRetrieverModule {}
