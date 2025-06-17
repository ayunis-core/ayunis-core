import { Module } from '@nestjs/common';
import { FileRetrieverModule } from './file-retrievers/file-retriever.module';
import { UrlRetrieverModule } from './url-retrievers/url-retriever.module';
import { InternetSearchRetrieverModule } from './internet-search-retrievers/internet-search-retriever.module';

@Module({
  imports: [
    FileRetrieverModule,
    UrlRetrieverModule,
    InternetSearchRetrieverModule,
  ],
  exports: [
    FileRetrieverModule,
    UrlRetrieverModule,
    InternetSearchRetrieverModule,
  ],
})
export class RetrieverModule {}
