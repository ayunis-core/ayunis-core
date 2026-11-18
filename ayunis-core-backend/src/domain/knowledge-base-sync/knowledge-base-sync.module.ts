import { Module } from '@nestjs/common';
import { ContextModule } from 'src/common/context/context.module';
import { ConnectorsModule } from 'src/domain/connectors/connectors.module';
import { KnowledgeBasesModule } from 'src/domain/knowledge-bases/knowledge-bases.module';
import { SourcesModule } from 'src/domain/sources/sources.module';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { SyncReconciler } from './application/services/sync-reconciler.service';
import { SyncPlanApplier } from './application/services/sync-plan-applier.service';
import { SyncedLocationLocks } from './application/services/synced-location-locks.service';
import { AddSyncedLocationUseCase } from './application/use-cases/add-synced-location/add-synced-location.use-case';
import { RemoveSyncedLocationUseCase } from './application/use-cases/remove-synced-location/remove-synced-location.use-case';
import { SyncLocationUseCase } from './application/use-cases/sync-location/sync-location.use-case';
import { LocalSyncedLocationsRepositoryModule } from './infrastructure/persistence/local/local-synced-locations-repository.module';
import { KnowledgeBaseSyncQueueModule } from './infrastructure/queue/knowledge-base-sync-queue.module';

@Module({
  imports: [
    LocalSyncedLocationsRepositoryModule,
    KnowledgeBaseSyncQueueModule,
    ConnectorsModule,
    KnowledgeBasesModule,
    SourcesModule,
    OrgsModule,
    ContextModule,
  ],
  providers: [
    SyncReconciler,
    SyncPlanApplier,
    SyncedLocationLocks,
    AddSyncedLocationUseCase,
    RemoveSyncedLocationUseCase,
    SyncLocationUseCase,
  ],
  exports: [
    AddSyncedLocationUseCase,
    RemoveSyncedLocationUseCase,
    SyncLocationUseCase,
  ],
})
export class KnowledgeBaseSyncModule {}
