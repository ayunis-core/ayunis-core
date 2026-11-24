import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModelsModule } from 'src/domain/models/models.module';
import { EmbeddingsModule } from 'src/domain/rag/embeddings/embeddings.module';
import { SplitterModule } from 'src/domain/rag/splitters/splitter.module';
import { FileRetrieverModule } from 'src/domain/retrievers/file-retrievers/file-retriever.module';
import { PlatformConfigModule } from 'src/iam/platform-config/platform-config.module';
import { OparlBodyLinksRepository } from './application/ports/oparl-body-links.repository';
import { OparlClientPort } from './application/ports/oparl-client.port';
import { OparlDocumentsRepository } from './application/ports/oparl-documents.repository';
import { OparlMirrorRepository } from './application/ports/oparl-mirror.repository';
import { OparlSyncJobsPort } from './application/ports/oparl-sync-jobs.port';
import { OparlSyncRunsRepository } from './application/ports/oparl-sync-runs.repository';
import { OparlSystemsRepository } from './application/ports/oparl-systems.repository';
import { OparlChunkEmbedder } from './application/services/oparl-chunk-embedder.service';
import { OparlChunker } from './application/services/oparl-chunker.service';
import { OparlFileTextReader } from './application/services/oparl-file-text-reader.service';
import { OparlObjectExtractor } from './application/services/oparl-object-extractor.service';
import { OparlObjectIndexer } from './application/services/oparl-object-indexer.service';
import { OparlPageWriter } from './application/services/oparl-page-writer.service';
import { OparlSyncService } from './application/services/oparl-sync.service';
import { OparlSystemOverviews } from './application/services/oparl-system-overviews.service';
import { AddOparlSystemUseCase } from './application/use-cases/add-oparl-system/add-oparl-system.use-case';
import { FindLinkedOparlBodiesUseCase } from './application/use-cases/find-linked-oparl-bodies/find-linked-oparl-bodies.use-case';
import { GetOparlEmbeddingModelUseCase } from './application/use-cases/get-oparl-embedding-model/get-oparl-embedding-model.use-case';
import { HasOparlVectorsOfModelUseCase } from './application/use-cases/has-oparl-vectors-of-model/has-oparl-vectors-of-model.use-case';
import { LinkOparlBodiesUseCase } from './application/use-cases/link-oparl-bodies/link-oparl-bodies.use-case';
import { ListOparlCatalogBodiesUseCase } from './application/use-cases/list-oparl-catalog-bodies/list-oparl-catalog-bodies.use-case';
import { ListOparlSystemsUseCase } from './application/use-cases/list-oparl-systems/list-oparl-systems.use-case';
import { ProcessOparlDocumentsUseCase } from './application/use-cases/process-oparl-documents/process-oparl-documents.use-case';
import { RunOparlSyncUseCase } from './application/use-cases/run-oparl-sync/run-oparl-sync.use-case';
import { SetOparlEmbeddingModelUseCase } from './application/use-cases/set-oparl-embedding-model/set-oparl-embedding-model.use-case';
import { SyncDueOparlSystemsUseCase } from './application/use-cases/sync-due-oparl-systems/sync-due-oparl-systems.use-case';
import { SyncOparlSystemNowUseCase } from './application/use-cases/sync-oparl-system-now/sync-oparl-system-now.use-case';
import { UnlinkOparlBodyUseCase } from './application/use-cases/unlink-oparl-body/unlink-oparl-body.use-case';
import { OparlHttpClient } from './infrastructure/http/oparl-http.client';
import { PostgresOparlBodyLinksRepository } from './infrastructure/persistence/postgres/postgres-oparl-body-links.repository';
import { PostgresOparlDocumentsRepository } from './infrastructure/persistence/postgres/postgres-oparl-documents.repository';
import { PostgresOparlMirrorRepository } from './infrastructure/persistence/postgres/postgres-oparl-mirror.repository';
import { PostgresOparlSyncRunsRepository } from './infrastructure/persistence/postgres/postgres-oparl-sync-runs.repository';
import { PostgresOparlSystemsRepository } from './infrastructure/persistence/postgres/postgres-oparl-systems.repository';
import { OparlBodyLinkRecord } from './infrastructure/persistence/postgres/schema/oparl-body-link.record';
import { OparlSyncRunRecord } from './infrastructure/persistence/postgres/schema/oparl-sync-run.record';
import { OparlSystemRecord } from './infrastructure/persistence/postgres/schema/oparl-system.record';
import { OPARL_SYNC_QUEUE } from './infrastructure/queue/oparl-sync.constants';
import { OparlSyncJobsProducer } from './infrastructure/queue/oparl-sync-jobs.producer';
import { OparlBodiesController } from './presenters/http/oparl-bodies.controller';
import { SuperAdminOparlEmbeddingModelController } from './presenters/http/super-admin-oparl-embedding-model.controller';
import { SuperAdminOparlSystemsController } from './presenters/http/super-admin-oparl-systems.controller';

/**
 * The OParl mirror. Its consumer and schedule are provided by
 * `IngestionConsumersModule`, so they run where the ingestion queues are
 * worked.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      OparlSystemRecord,
      OparlSyncRunRecord,
      OparlBodyLinkRecord,
    ]),
    BullModule.registerQueue({ name: OPARL_SYNC_QUEUE }),
    FileRetrieverModule,
    SplitterModule,
    EmbeddingsModule,
    ModelsModule,
    PlatformConfigModule,
  ],
  controllers: [
    OparlBodiesController,
    SuperAdminOparlSystemsController,
    SuperAdminOparlEmbeddingModelController,
  ],
  providers: [
    { provide: OparlClientPort, useClass: OparlHttpClient },
    { provide: OparlMirrorRepository, useClass: PostgresOparlMirrorRepository },
    {
      provide: OparlDocumentsRepository,
      useClass: PostgresOparlDocumentsRepository,
    },
    {
      provide: OparlSystemsRepository,
      useClass: PostgresOparlSystemsRepository,
    },
    {
      provide: OparlSyncRunsRepository,
      useClass: PostgresOparlSyncRunsRepository,
    },
    {
      provide: OparlBodyLinksRepository,
      useClass: PostgresOparlBodyLinksRepository,
    },
    { provide: OparlSyncJobsPort, useClass: OparlSyncJobsProducer },
    OparlObjectExtractor,
    OparlPageWriter,
    OparlSyncService,
    OparlSystemOverviews,
    OparlChunker,
    OparlFileTextReader,
    OparlObjectIndexer,
    OparlChunkEmbedder,
    AddOparlSystemUseCase,
    ListOparlSystemsUseCase,
    SyncOparlSystemNowUseCase,
    SyncDueOparlSystemsUseCase,
    RunOparlSyncUseCase,
    ProcessOparlDocumentsUseCase,
    GetOparlEmbeddingModelUseCase,
    SetOparlEmbeddingModelUseCase,
    HasOparlVectorsOfModelUseCase,
    ListOparlCatalogBodiesUseCase,
    LinkOparlBodiesUseCase,
    UnlinkOparlBodyUseCase,
    FindLinkedOparlBodiesUseCase,
  ],
  exports: [
    RunOparlSyncUseCase,
    SyncDueOparlSystemsUseCase,
    ProcessOparlDocumentsUseCase,
    HasOparlVectorsOfModelUseCase,
    FindLinkedOparlBodiesUseCase,
    BullModule,
  ],
})
export class OparlModule {}
