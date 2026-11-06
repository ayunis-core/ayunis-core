import { Module } from '@nestjs/common';
import { RuntimeInfrastructureModule } from './runtime-infrastructure.module';
import { ModelsModule } from 'src/domain/models/models.module';
import { DocumentProcessingModule } from 'src/domain/sources/infrastructure/queue/document-processing.module';
import { DataSourceProcessingModule } from 'src/domain/sources/infrastructure/queue/data-source-processing.module';
import { UrlCrawlModule } from 'src/domain/sources/infrastructure/queue/url-crawl.module';

@Module({
  imports: [
    RuntimeInfrastructureModule,
    ModelsModule,
    DocumentProcessingModule,
    DataSourceProcessingModule,
    UrlCrawlModule,
  ],
})
export class IngestionWorkerModule {}
