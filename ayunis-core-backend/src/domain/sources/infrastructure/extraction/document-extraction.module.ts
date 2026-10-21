import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import {
  type ExtractionConfig,
  extractionConfig,
} from 'src/config/extraction.config';
import storageConfig from 'src/config/storage.config';
import { DocumentExtractionPort } from 'src/domain/sources/application/ports/document-extraction.port';
import { DisabledDocumentExtractionAdapter } from './disabled-document-extraction.adapter';
import { HttpDocumentExtractionAdapter } from './http-document-extraction.adapter';

@Module({
  imports: [
    ConfigModule.forFeature(extractionConfig),
    ConfigModule.forFeature(storageConfig),
  ],
  providers: [
    {
      provide: DocumentExtractionPort,
      useFactory: (
        config: ExtractionConfig,
        storage: ConfigType<typeof storageConfig>,
      ): DocumentExtractionPort =>
        config.url
          ? new HttpDocumentExtractionAdapter(config, storage)
          : new DisabledDocumentExtractionAdapter(),
      inject: [extractionConfig.KEY, storageConfig.KEY],
    },
  ],
  exports: [DocumentExtractionPort],
})
export class DocumentExtractionModule {}
