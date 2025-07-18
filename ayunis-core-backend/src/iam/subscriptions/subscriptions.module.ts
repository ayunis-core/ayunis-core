import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksModule } from '../../common/webhooks/webhooks.module';
import { HasActiveSubscriptionUseCase } from './application/use-cases/has-active-subscription/has-active-subscription.use-case';
import { GetActiveSubscriptionUseCase } from './application/use-cases/get-active-subscription/get-active-subscription.use-case';
import { CreateSubscriptionUseCase } from './application/use-cases/create-subscription/create-subscription.use-case';
import { CancelSubscriptionUseCase } from './application/use-cases/cancel-subscription/cancel-subscription.use-case';
import { UncancelSubscriptionUseCase } from './application/use-cases/uncancel-subscription/uncancel-subscription.use-case';
import { SubscriptionRepository } from './application/ports/subscription.repository';
import { LocalSubscriptionsRepository } from './infrastructure/persistence/local/local-subscriptions.repository';
import { SubscriptionRecord } from './infrastructure/persistence/local/schema/subscription.record';
import { SubscriptionMapper } from './infrastructure/persistence/local/mappers/subscription.mapper';
import { SubscriptionsController } from './presenters/http/subscriptions.controller';
import { SubscriptionResponseMapper } from './presenters/http/mappers/subscription-response.mapper';
import { UsersModule } from '../users/users.module';
import { InvitesModule } from '../invites/invites.module';
import { UpdateSeatsUseCase } from './application/use-cases/update-seats/update-seats.use-case';
import { UpdateBillingInfoUseCase } from './application/use-cases/update-billing-info/update-billing-info.use-case';
import { SubscriptionBillingInfoMapper } from './infrastructure/persistence/local/mappers/subscription-billing-info.mapper';
import { SubscriptionBillingInfoRecord } from './infrastructure/persistence/local/schema/subscription-billing-info.record';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionRecord,
      SubscriptionBillingInfoRecord,
    ]),
    UsersModule,
    forwardRef(() => InvitesModule),
    WebhooksModule,
  ],
  controllers: [SubscriptionsController],
  providers: [
    {
      provide: SubscriptionRepository,
      useClass: LocalSubscriptionsRepository,
    },
    SubscriptionMapper,
    SubscriptionResponseMapper,
    SubscriptionBillingInfoMapper,
    HasActiveSubscriptionUseCase,
    GetActiveSubscriptionUseCase,
    CreateSubscriptionUseCase,
    CancelSubscriptionUseCase,
    UncancelSubscriptionUseCase,
    UpdateSeatsUseCase,
    UpdateBillingInfoUseCase,
  ],
  exports: [
    HasActiveSubscriptionUseCase,
    GetActiveSubscriptionUseCase,
    CreateSubscriptionUseCase,
    UpdateSeatsUseCase,
  ],
})
export class SubscriptionsModule {}
