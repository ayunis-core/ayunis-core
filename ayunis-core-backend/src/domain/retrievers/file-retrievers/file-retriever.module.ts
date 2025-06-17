import { Module } from '@nestjs/common';
import { MistralFileRetrieverHandler } from './infrastructure/adapters/mistral-file-retriever.handler';
import { FileRetrieverHandler } from './application/ports/file-retriever.handler';
import { FileRetrieversController } from './presenters/http/file-retrievers.controller';
import { ProcessFileUseCase } from './application/use-cases/process-file/process-file.use-case';

@Module({
  providers: [
    {
      provide: FileRetrieverHandler,
      useClass: MistralFileRetrieverHandler,
    },
    ProcessFileUseCase,
    MistralFileRetrieverHandler,
  ],
  controllers: [FileRetrieversController],
  exports: [ProcessFileUseCase],
})
export class FileRetrieverModule {}
