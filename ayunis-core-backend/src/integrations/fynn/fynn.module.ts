import { WebhooksModule } from 'src/integrations/webhooks/webhooks.module';
import { FynnSyncRevision } from './application/ports/fynn-sync-revision';
import { PostgresFynnSyncRevision } from './infrastructure/persistence/postgres-fynn-sync-revision';
import { FynnSyncRevisionRecord } from './infrastructure/persistence/schema/fynn-sync-revision.record';
import { FynnOutbox } from './application/ports/fynn-outbox';
import { PostgresFynnOutbox } from './infrastructure/persistence/postgres-fynn-outbox';
import { FynnOutboxRecord } from './infrastructure/persistence/schema/fynn-outbox.record';
import { FynnOutboxTask } from './infrastructure/tasks/fynn-outbox.task';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FynnOrgLinkRecord } from 'src/integrations/fynn/infrastructure/persistence/schema/fynn-org-link.record';
import { PostgresFynnOrgLinkRepository } from 'src/integrations/fynn/infrastructure/persistence/postgres-fynn-org-link.repository';
import { FynnOrgLinkRepository } from 'src/integrations/fynn/application/ports/fynn-org-link.repository';
import { FynnSyncEventsService } from 'src/integrations/fynn/application/services/fynn-sync-events.service';
import { RevokeUnlinkedFynnAccessUseCase } from 'src/integrations/fynn/application/use-cases/revoke-unlinked-fynn-access/revoke-unlinked-fynn-access.use-case';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreConnectModule } from 'src/integrations/core-connect/core-connect.module';
import { SubscriptionsModule } from 'src/iam/subscriptions/subscriptions.module';
import { TrialsModule } from 'src/iam/trials/trials.module';
import { AddonsModule } from 'src/iam/addons/addons.module';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { FynnClient } from 'src/integrations/fynn/application/ports/fynn-client';
import { FynnHttpClient } from 'src/integrations/fynn/infrastructure/http/fynn-http-client';
import { LoadFynnSnapshotService } from 'src/integrations/fynn/application/services/load-fynn-snapshot.service';
import { SyncFynnSubscriptionUseCase } from 'src/integrations/fynn/application/use-cases/sync-fynn-subscription/sync-fynn-subscription.use-case';
import { FynnSyncController } from 'src/integrations/fynn/presenters/http/fynn-sync.controller';

import { FynnReconciliationLock } from 'src/integrations/fynn/application/ports/fynn-reconciliation-lock';
import { PostgresFynnReconciliationLock } from 'src/integrations/fynn/infrastructure/persistence/postgres-fynn-reconciliation-lock';
import { FynnReconciliationTask } from 'src/integrations/fynn/infrastructure/tasks/fynn-reconciliation.task';
import { ReconcileFynnSubscriptionsUseCase } from 'src/integrations/fynn/application/use-cases/reconcile-fynn-subscriptions/reconcile-fynn-subscriptions.use-case';

import { FynnCustomerSyncController } from 'src/integrations/fynn/presenters/http/fynn-customer-sync.controller';

@Module({
  imports: [
    WebhooksModule,
    TypeOrmModule.forFeature([
      FynnOrgLinkRecord,
      FynnOutboxRecord,
      FynnSyncRevisionRecord,
    ]),
    ConfigModule,
    CoreConnectModule,
    SubscriptionsModule,
    TrialsModule,
    AddonsModule,
    OrgsModule,
  ],
  controllers: [FynnSyncController, FynnCustomerSyncController],
  providers: [
    { provide: FynnOrgLinkRepository, useClass: PostgresFynnOrgLinkRepository },
    FynnSyncEventsService,
    { provide: FynnOutbox, useClass: PostgresFynnOutbox },
    FynnOutboxTask,
    { provide: FynnSyncRevision, useClass: PostgresFynnSyncRevision },
    RevokeUnlinkedFynnAccessUseCase,
    { provide: FynnClient, useClass: FynnHttpClient },
    {
      provide: FynnReconciliationLock,
      useClass: PostgresFynnReconciliationLock,
    },
    FynnReconciliationTask,
    ReconcileFynnSubscriptionsUseCase,
    LoadFynnSnapshotService,
    SyncFynnSubscriptionUseCase,
  ],
  exports: [SyncFynnSubscriptionUseCase],
})
export class FynnModule {}
