import { ListExternalSubscriptionLinksUseCase } from './application/use-cases/list-external-subscription-links/list-external-subscription-links.use-case';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoreConnectModule } from 'src/integrations/core-connect/core-connect.module';
import { WebhooksModule } from 'src/integrations/webhooks/webhooks.module';
import { SubscriptionsModule } from 'src/iam/subscriptions/subscriptions.module';
import { TrialsModule } from 'src/iam/trials/trials.module';
import { AddonsModule } from 'src/iam/addons/addons.module';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { ExternalSubscriptionLinkRepository } from './application/ports/external-subscription-link.repository';
import { ExternalSubscriptionRevision } from './application/ports/external-subscription-revision';
import { ExternalSubscriptionOutbox } from './application/ports/external-subscription-outbox';
import { ExternalSubscriptionLease } from './application/ports/external-subscription-lease';
import { PostgresExternalSubscriptionLinkRepository } from './infrastructure/persistence/postgres-external-subscription-link.repository';
import { PostgresExternalSubscriptionRevision } from './infrastructure/persistence/postgres-external-subscription-revision';
import { PostgresExternalSubscriptionOutbox } from './infrastructure/persistence/postgres-external-subscription-outbox';
import { PostgresExternalSubscriptionLease } from './infrastructure/persistence/postgres-external-subscription-lease';
import { ExternalSubscriptionLinkRecord } from './infrastructure/persistence/schema/external-subscription-link.record';
import { ExternalSubscriptionRevisionRecord } from './infrastructure/persistence/schema/external-subscription-revision.record';
import { ExternalSubscriptionOutboxRecord } from './infrastructure/persistence/schema/external-subscription-outbox.record';
import { ExternalSubscriptionLeaseRecord } from './infrastructure/persistence/schema/external-subscription-lease.record';
import { ExternalSubscriptionEventsService } from './application/services/external-subscription-events.service';
import { ExternalSubscriptionOutboxTask } from './infrastructure/tasks/external-subscription-outbox.task';
import { ApplyExternalSubscriptionUseCase } from './application/use-cases/apply-external-subscription/apply-external-subscription.use-case';
import { PrepareExternalSubscriptionUseCase } from './application/use-cases/prepare-external-subscription/prepare-external-subscription.use-case';
import { ExternalSubscriptionCoordinationUseCase } from './application/use-cases/external-subscription-coordination/external-subscription-coordination.use-case';
import { ExternalSubscriptionsController } from './presenters/http/external-subscriptions.controller';

@Module({
  imports: [
    ConfigModule,
    CoreConnectModule,
    WebhooksModule,
    SubscriptionsModule,
    TrialsModule,
    AddonsModule,
    OrgsModule,
    TypeOrmModule.forFeature([
      ExternalSubscriptionLinkRecord,
      ExternalSubscriptionRevisionRecord,
      ExternalSubscriptionOutboxRecord,
      ExternalSubscriptionLeaseRecord,
    ]),
  ],
  controllers: [ExternalSubscriptionsController],
  providers: [
    {
      provide: ExternalSubscriptionLinkRepository,
      useClass: PostgresExternalSubscriptionLinkRepository,
    },
    {
      provide: ExternalSubscriptionRevision,
      useClass: PostgresExternalSubscriptionRevision,
    },
    {
      provide: ExternalSubscriptionOutbox,
      useClass: PostgresExternalSubscriptionOutbox,
    },
    {
      provide: ExternalSubscriptionLease,
      useClass: PostgresExternalSubscriptionLease,
    },
    ExternalSubscriptionEventsService,
    ExternalSubscriptionOutboxTask,
    ApplyExternalSubscriptionUseCase,
    PrepareExternalSubscriptionUseCase,
    ExternalSubscriptionCoordinationUseCase,
    ListExternalSubscriptionLinksUseCase,
  ],
})
export class ExternalSubscriptionsModule {}
