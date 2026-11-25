import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OparlClientPort } from './application/ports/oparl-client.port';
import { OparlMirrorRepository } from './application/ports/oparl-mirror.repository';
import { OparlSyncJobsPort } from './application/ports/oparl-sync-jobs.port';
import { OparlSyncRunsRepository } from './application/ports/oparl-sync-runs.repository';
import { OparlSystemsRepository } from './application/ports/oparl-systems.repository';
import { OparlObjectExtractor } from './application/services/oparl-object-extractor.service';
import { OparlPageWriter } from './application/services/oparl-page-writer.service';
import { OparlSyncService } from './application/services/oparl-sync.service';
import { OparlSystemOverviews } from './application/services/oparl-system-overviews.service';
import { AddOparlSystemUseCase } from './application/use-cases/add-oparl-system/add-oparl-system.use-case';
import { ListOparlSystemsUseCase } from './application/use-cases/list-oparl-systems/list-oparl-systems.use-case';
import { RunOparlSyncUseCase } from './application/use-cases/run-oparl-sync/run-oparl-sync.use-case';
import { SyncDueOparlSystemsUseCase } from './application/use-cases/sync-due-oparl-systems/sync-due-oparl-systems.use-case';
import { SyncOparlSystemNowUseCase } from './application/use-cases/sync-oparl-system-now/sync-oparl-system-now.use-case';
import { OparlHttpClient } from './infrastructure/http/oparl-http.client';
import { PostgresOparlMirrorRepository } from './infrastructure/persistence/postgres/postgres-oparl-mirror.repository';
import { PostgresOparlSyncRunsRepository } from './infrastructure/persistence/postgres/postgres-oparl-sync-runs.repository';
import { PostgresOparlSystemsRepository } from './infrastructure/persistence/postgres/postgres-oparl-systems.repository';
import { OparlSyncRunRecord } from './infrastructure/persistence/postgres/schema/oparl-sync-run.record';
import { OparlSystemRecord } from './infrastructure/persistence/postgres/schema/oparl-system.record';
import { OPARL_SYNC_QUEUE } from './infrastructure/queue/oparl-sync.constants';
import { OparlSyncJobsProducer } from './infrastructure/queue/oparl-sync-jobs.producer';
import { SuperAdminOparlSystemsController } from './presenters/http/super-admin-oparl-systems.controller';

/**
 * The OParl mirror. Its consumer and schedule are provided by
 * `IngestionConsumersModule`, so they run where the ingestion queues are
 * worked.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([OparlSystemRecord, OparlSyncRunRecord]),
    BullModule.registerQueue({ name: OPARL_SYNC_QUEUE }),
  ],
  controllers: [SuperAdminOparlSystemsController],
  providers: [
    { provide: OparlClientPort, useClass: OparlHttpClient },
    { provide: OparlMirrorRepository, useClass: PostgresOparlMirrorRepository },
    {
      provide: OparlSystemsRepository,
      useClass: PostgresOparlSystemsRepository,
    },
    {
      provide: OparlSyncRunsRepository,
      useClass: PostgresOparlSyncRunsRepository,
    },
    { provide: OparlSyncJobsPort, useClass: OparlSyncJobsProducer },
    OparlObjectExtractor,
    OparlPageWriter,
    OparlSyncService,
    OparlSystemOverviews,
    AddOparlSystemUseCase,
    ListOparlSystemsUseCase,
    SyncOparlSystemNowUseCase,
    SyncDueOparlSystemsUseCase,
    RunOparlSyncUseCase,
  ],
  exports: [RunOparlSyncUseCase, SyncDueOparlSystemsUseCase, BullModule],
})
export class OparlModule {}
