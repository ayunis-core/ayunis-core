import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MistralFileRetrieverHandler } from './infrastructure/adapters/mistral-file-retriever.handler';
import { FileRetrieverRegistry } from './application/file-retriever-handler.registry';
import { RetrieveFileContentUseCase } from './application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import { FileRetrieverType } from './domain/value-objects/file-retriever-type.enum';
import { NpmPdfParseFileRetrieverHandler } from './infrastructure/adapters/npm-pdf-parse-file-retriever.handler';
import { DoclingFileRetrieverHandler } from './infrastructure/adapters/docling-file-retriever.handler';
import retrievalConfig from 'src/config/retrieval.config';

@Module({
  imports: [ConfigModule.forFeature(retrievalConfig)],
  providers: [
    FileRetrieverRegistry,
    MistralFileRetrieverHandler, // Keep handler code - may be re-enabled in future
    NpmPdfParseFileRetrieverHandler,
    DoclingFileRetrieverHandler,
    RetrieveFileContentUseCase,
    {
      provide: FileRetrieverRegistry,
      useFactory: (
        npmPdfParseHandler: NpmPdfParseFileRetrieverHandler,
        doclingHandler: DoclingFileRetrieverHandler,
      ) => {
        const registry = new FileRetrieverRegistry();
        // Note: MistralFileRetrieverHandler not registered - requires permitted provider check
        registry.registerHandler(
          FileRetrieverType.NPM_PDF_PARSE,
          npmPdfParseHandler,
        );
        registry.registerHandler(FileRetrieverType.DOCLING, doclingHandler);
        return registry;
      },
      inject: [NpmPdfParseFileRetrieverHandler, DoclingFileRetrieverHandler],
    },
  ],
  exports: [RetrieveFileContentUseCase, FileRetrieverRegistry],
})
export class FileRetrieverModule {}
