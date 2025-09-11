import { forwardRef, Module } from '@nestjs/common';
import { MistralFileRetrieverHandler } from './infrastructure/adapters/mistral-file-retriever.handler';
import { FileRetrieverRegistry } from './application/file-retriever-handler.registry';
import { RetrieveFileContentUseCase } from './application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import { FileRetrieverType } from './domain/value-objects/file-retriever-type.enum';
import { ModelsModule } from 'src/domain/models/models.module';
import { NpmPdfParseFileRetrieverHandler } from './infrastructure/adapters/npm-pdf-parse-file-retriever.handler';

@Module({
  imports: [forwardRef(() => ModelsModule)],
  providers: [
    FileRetrieverRegistry,
    MistralFileRetrieverHandler,
    NpmPdfParseFileRetrieverHandler,
    RetrieveFileContentUseCase,
    {
      provide: FileRetrieverRegistry,
      useFactory: (
        mistralHandler: MistralFileRetrieverHandler,
        npmPdfParseHandler: NpmPdfParseFileRetrieverHandler,
      ) => {
        const registry = new FileRetrieverRegistry();
        registry.registerHandler(FileRetrieverType.MISTRAL, mistralHandler);
        registry.registerHandler(
          FileRetrieverType.NPM_PDF_PARSE,
          npmPdfParseHandler,
        );
        return registry;
      },
      inject: [MistralFileRetrieverHandler, NpmPdfParseFileRetrieverHandler],
    },
  ],
  exports: [RetrieveFileContentUseCase, FileRetrieverRegistry],
})
export class FileRetrieverModule {}
