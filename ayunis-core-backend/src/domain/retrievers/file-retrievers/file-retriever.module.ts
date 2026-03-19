import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MistralFileRetrieverHandler } from './infrastructure/adapters/mistral-file-retriever.handler';
import { FileRetrieverRegistry } from './application/file-retriever-handler.registry';
import { RetrieveFileContentUseCase } from './application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import { FileRetrieverType } from './domain/value-objects/file-retriever-type.enum';
import { NpmPdfParseFileRetrieverHandler } from './infrastructure/adapters/npm-pdf-parse-file-retriever.handler';
import { GotenbergConverterService } from './infrastructure/adapters/gotenberg-converter.service';
import { DocumentConverterPort } from './application/ports/document-converter.port';
import retrievalConfig from 'src/config/retrieval.config';
import { gotenbergConfig } from 'src/config/gotenberg.config';

@Module({
  imports: [
    ConfigModule.forFeature(retrievalConfig),
    ConfigModule.forFeature(gotenbergConfig),
  ],
  providers: [
    FileRetrieverRegistry,
    MistralFileRetrieverHandler,
    NpmPdfParseFileRetrieverHandler,
    GotenbergConverterService,
    RetrieveFileContentUseCase,
    {
      provide: DocumentConverterPort,
      useExisting: GotenbergConverterService,
    },
    {
      provide: FileRetrieverRegistry,
      useFactory: (
        npmPdfParseHandler: NpmPdfParseFileRetrieverHandler,
        mistralHandler: MistralFileRetrieverHandler,
      ) => {
        const registry = new FileRetrieverRegistry();
        registry.registerHandler(
          FileRetrieverType.NPM_PDF_PARSE,
          npmPdfParseHandler,
        );
        registry.registerHandler(FileRetrieverType.MISTRAL, mistralHandler);
        return registry;
      },
      inject: [NpmPdfParseFileRetrieverHandler, MistralFileRetrieverHandler],
    },
  ],
  exports: [RetrieveFileContentUseCase, FileRetrieverRegistry],
})
export class FileRetrieverModule {}
