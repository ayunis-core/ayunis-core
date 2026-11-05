import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { BaseModule } from './base.module';
import { IngestionRuntimeService } from './infrastructure/ingestion-runtime.service';
import { ModelsModule } from 'src/domain/models/models.module';
import { DocumentProcessingModule } from 'src/domain/sources/infrastructure/queue/document-processing.module';
import { DataSourceProcessingModule } from 'src/domain/sources/infrastructure/queue/data-source-processing.module';
import { UrlCrawlModule } from 'src/domain/sources/infrastructure/queue/url-crawl.module';

@Module({
  imports: [
    BaseModule,
    DiscoveryModule,
    ModelsModule,
    DocumentProcessingModule,
    DataSourceProcessingModule,
    UrlCrawlModule,
  ],
  providers: [IngestionRuntimeService],
})
export class IngestionWorkerModule {}
