import { forwardRef, Module } from '@nestjs/common';
import { MistralFileRetrieverHandler } from './infrastructure/adapters/mistral-file-retriever.handler';
import { FileRetrieverRegistry } from './application/file-retriever-handler.registry';
import { ProcessFileUseCase } from './application/use-cases/process-file/process-file.use-case';
import { FileRetrieverType } from './domain/value-objects/file-retriever-type.enum';
import { ModelsModule } from 'src/domain/models/models.module';

@Module({
  imports: [forwardRef(() => ModelsModule)],
  providers: [
    FileRetrieverRegistry,
    MistralFileRetrieverHandler,
    ProcessFileUseCase,
    {
      provide: FileRetrieverRegistry,
      useFactory: (mistralHandler: MistralFileRetrieverHandler) => {
        const registry = new FileRetrieverRegistry();
        registry.registerHandler(FileRetrieverType.MISTRAL, mistralHandler);
        return registry;
      },
      inject: [MistralFileRetrieverHandler],
    },
  ],
  exports: [ProcessFileUseCase, FileRetrieverRegistry],
})
export class FileRetrieverModule {}
