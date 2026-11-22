import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { SyncRunsPort } from 'src/domain/knowledge-base-sync/application/ports/sync-runs.port';
import { SyncedFileJobsPort } from 'src/domain/knowledge-base-sync/application/ports/synced-file-jobs.port';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { KNOWLEDGE_BASE_SYNC_QUEUE } from './knowledge-base-sync.constants';
import { SyncRunsProducer } from './sync-runs.producer';
import { SyncedFileJobsProducer } from './synced-file-jobs.producer';

// Enqueue side only; the consumer lives in IngestionConsumersModule like the
// other ingestion consumers.
@Module({
  imports: [
    OrgsModule,
    BullModule.registerQueue({ name: KNOWLEDGE_BASE_SYNC_QUEUE }),
  ],
  providers: [
    { provide: SyncedFileJobsPort, useClass: SyncedFileJobsProducer },
    { provide: SyncRunsPort, useClass: SyncRunsProducer },
  ],
  exports: [SyncedFileJobsPort, SyncRunsPort, BullModule],
})
export class KnowledgeBaseSyncQueueModule {}
