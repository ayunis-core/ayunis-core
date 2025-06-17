import { Module } from '@nestjs/common';
import { LocalSourceRepositoryModule } from './infrastructure/persistence/local/local-source-repository.module';
import { SplitterModule } from '../splitter/splitter.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { RetrieverModule } from '../retrievers/retriever.module';
import { SourcesController } from './presenters/http/sources.controller';

// Import all use cases
import { GetSourceByIdUseCase } from './application/use-cases/get-source-by-id/get-source-by-id.use-case';
import { GetSourcesByThreadIdUseCase } from './application/use-cases/get-sources-by-thread-id/get-sources-by-thread-id.use-case';
import { GetSourcesByUserIdUseCase } from './application/use-cases/get-sources-by-user-id/get-sources-by-user-id.use-case';
import { DeleteSourceUseCase } from './application/use-cases/delete-source/delete-source.use-case';
import { CreateFileSourceUseCase } from './application/use-cases/create-file-source/create-file-source.use-case';
import { CreateUrlSourceUseCase } from './application/use-cases/create-url-source/create-url-source.use-case';
import { MatchSourceContentChunksUseCase } from './application/use-cases/match-source-content-chunks/match-source-content-chunks.use-case';

@Module({
  imports: [
    LocalSourceRepositoryModule,
    RetrieverModule,
    SplitterModule,
    EmbeddingsModule,
  ],
  controllers: [SourcesController],
  providers: [
    GetSourceByIdUseCase,
    GetSourcesByThreadIdUseCase,
    GetSourcesByUserIdUseCase,
    DeleteSourceUseCase,
    CreateFileSourceUseCase,
    CreateUrlSourceUseCase,
    MatchSourceContentChunksUseCase,
  ],
  exports: [
    GetSourceByIdUseCase,
    GetSourcesByThreadIdUseCase,
    GetSourcesByUserIdUseCase,
    DeleteSourceUseCase,
    CreateFileSourceUseCase,
    CreateUrlSourceUseCase,
    MatchSourceContentChunksUseCase,
  ],
})
export class SourcesModule {}
