import { Module } from '@nestjs/common';
import { ContextModule } from 'src/common/context/context.module';
import { ConnectorsModule } from 'src/domain/connectors/connectors.module';
import { KnowledgeBasesModule } from 'src/domain/knowledge-bases/knowledge-bases.module';
import { SourcesModule } from 'src/domain/sources/sources.module';
import { StorageModule } from 'src/domain/storage/storage.module';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { SyncReconciler } from './application/services/sync-reconciler.service';
import { SyncPlanApplier } from './application/services/sync-plan-applier.service';
import { SyncedLocationLocks } from './application/services/synced-location-locks.service';
import { SyncedFileDocuments } from './application/services/synced-file-documents.service';
import { ConnectorSyncSource } from './application/services/connector-sync-source.service';
import { SyncSources } from './application/services/sync-sources.service';
import { FailedSourcesDeletedListener } from './application/listeners/failed-sources-deleted.listener';
import { StartSyncedFileProcessingUseCase } from './application/use-cases/start-synced-file-processing/start-synced-file-processing.use-case';
import { CompleteSyncedFileProcessingUseCase } from './application/use-cases/complete-synced-file-processing/complete-synced-file-processing.use-case';
import { FailSyncedFileProcessingUseCase } from './application/use-cases/fail-synced-file-processing/fail-synced-file-processing.use-case';
import { AddSyncedLocationUseCase } from './application/use-cases/add-synced-location/add-synced-location.use-case';
import { RemoveSyncedLocationUseCase } from './application/use-cases/remove-synced-location/remove-synced-location.use-case';
import { SyncLocationUseCase } from './application/use-cases/sync-location/sync-location.use-case';
import { NextSyncedFileBatchUseCase } from './application/use-cases/next-synced-file-batch/next-synced-file-batch.use-case';
import { FinishLocationSyncUseCase } from './application/use-cases/finish-location-sync/finish-location-sync.use-case';
import { PauseSyncedLocationUseCase } from './application/use-cases/pause-synced-location/pause-synced-location.use-case';
import { SyncLocationNowUseCase } from './application/use-cases/sync-location-now/sync-location-now.use-case';
import { ListSyncedLocationsUseCase } from './application/use-cases/list-synced-locations/list-synced-locations.use-case';
import { KnowledgeBaseSyncedLocationsController } from './presenters/http/knowledge-base-synced-locations.controller';
import { SyncDueLocationsUseCase } from './application/use-cases/sync-due-locations/sync-due-locations.use-case';
import { LocalSyncedLocationsRepositoryModule } from './infrastructure/persistence/local/local-synced-locations-repository.module';
import { KnowledgeBaseSyncQueueModule } from './infrastructure/queue/knowledge-base-sync-queue.module';

@Module({
  imports: [
    LocalSyncedLocationsRepositoryModule,
    KnowledgeBaseSyncQueueModule,
    ConnectorsModule,
    KnowledgeBasesModule,
    SourcesModule,
    StorageModule,
    OrgsModule,
    ContextModule,
  ],
  controllers: [KnowledgeBaseSyncedLocationsController],
  providers: [
    SyncReconciler,
    SyncPlanApplier,
    SyncedLocationLocks,
    SyncedFileDocuments,
    ConnectorSyncSource,
    SyncSources,
    FailedSourcesDeletedListener,
    AddSyncedLocationUseCase,
    RemoveSyncedLocationUseCase,
    SyncLocationUseCase,
    NextSyncedFileBatchUseCase,
    FinishLocationSyncUseCase,
    PauseSyncedLocationUseCase,
    SyncLocationNowUseCase,
    SyncDueLocationsUseCase,
    ListSyncedLocationsUseCase,
    StartSyncedFileProcessingUseCase,
    CompleteSyncedFileProcessingUseCase,
    FailSyncedFileProcessingUseCase,
  ],
  exports: [
    // The queue, for the consumer in IngestionConsumersModule.
    KnowledgeBaseSyncQueueModule,
    AddSyncedLocationUseCase,
    RemoveSyncedLocationUseCase,
    SyncLocationUseCase,
    NextSyncedFileBatchUseCase,
    FinishLocationSyncUseCase,
    PauseSyncedLocationUseCase,
    SyncLocationNowUseCase,
    SyncDueLocationsUseCase,
    StartSyncedFileProcessingUseCase,
    CompleteSyncedFileProcessingUseCase,
    FailSyncedFileProcessingUseCase,
  ],
})
export class KnowledgeBaseSyncModule {}
