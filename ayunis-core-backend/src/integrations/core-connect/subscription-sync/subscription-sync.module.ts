import { ListSubscriptionSyncLinksUseCase } from './application/use-cases/list-subscription-sync-links/list-subscription-sync-links.use-case';
import { SubscriptionSyncOutboxTask } from './infrastructure/tasks/subscription-sync-outbox.task';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoreConnectAuthModule } from 'src/integrations/core-connect/auth/core-connect-auth.module';
import { WebhooksModule } from 'src/integrations/webhooks/webhooks.module';
import { SubscriptionsModule } from 'src/iam/subscriptions/subscriptions.module';
import { TrialsModule } from 'src/iam/trials/trials.module';
import { AddonsModule } from 'src/iam/addons/addons.module';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { SubscriptionSyncLinkRepository } from './application/ports/subscription-sync-link.repository';
import { SubscriptionSyncRevision } from './application/ports/subscription-sync-revision';
import { SubscriptionSyncOutbox } from './application/ports/subscription-sync-outbox';
import { SubscriptionSyncLease } from './application/ports/subscription-sync-lease';
import { PostgresSubscriptionSyncLinkRepository } from './infrastructure/persistence/postgres-subscription-sync-link.repository';
import { PostgresSubscriptionSyncRevision } from './infrastructure/persistence/postgres-subscription-sync-revision';
import { PostgresSubscriptionSyncOutbox } from './infrastructure/persistence/postgres-subscription-sync-outbox';
import { PostgresSubscriptionSyncLease } from './infrastructure/persistence/postgres-subscription-sync-lease';
import { SubscriptionSyncLinkRecord } from './infrastructure/persistence/schema/subscription-sync-link.record';
import { SubscriptionSyncRevisionRecord } from './infrastructure/persistence/schema/subscription-sync-revision.record';
import { SubscriptionSyncOutboxRecord } from './infrastructure/persistence/schema/subscription-sync-outbox.record';
import { SubscriptionSyncLeaseRecord } from './infrastructure/persistence/schema/subscription-sync-lease.record';
import { SubscriptionSyncEventsService } from './application/services/subscription-sync-events.service';
import { ApplySubscriptionSyncStateUseCase } from './application/use-cases/apply-subscription-sync-state/apply-subscription-sync-state.use-case';
import { PrepareSubscriptionSyncUseCase } from './application/use-cases/prepare-subscription-sync/prepare-subscription-sync.use-case';
import { SubscriptionSyncCoordinationUseCase } from './application/use-cases/subscription-sync-coordination/subscription-sync-coordination.use-case';
import { SubscriptionSyncController } from './presenters/http/subscription-sync.controller';

@Module({
  imports: [
    ConfigModule,
    CoreConnectAuthModule,
    WebhooksModule,
    SubscriptionsModule,
    TrialsModule,
    AddonsModule,
    OrgsModule,
    TypeOrmModule.forFeature([
      SubscriptionSyncLinkRecord,
      SubscriptionSyncRevisionRecord,
      SubscriptionSyncOutboxRecord,
      SubscriptionSyncLeaseRecord,
    ]),
  ],
  controllers: [SubscriptionSyncController],
  providers: [
    {
      provide: SubscriptionSyncLinkRepository,
      useClass: PostgresSubscriptionSyncLinkRepository,
    },
    {
      provide: SubscriptionSyncRevision,
      useClass: PostgresSubscriptionSyncRevision,
    },
    {
      provide: SubscriptionSyncOutbox,
      useClass: PostgresSubscriptionSyncOutbox,
    },
    {
      provide: SubscriptionSyncLease,
      useClass: PostgresSubscriptionSyncLease,
    },
    SubscriptionSyncEventsService,
    SubscriptionSyncOutboxTask,
    ApplySubscriptionSyncStateUseCase,
    PrepareSubscriptionSyncUseCase,
    SubscriptionSyncCoordinationUseCase,
    ListSubscriptionSyncLinksUseCase,
  ],
})
export class SubscriptionSyncModule {}
