import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HasActiveSubscriptionUseCase } from './application/use-cases/has-active-subscription/has-active-subscription.use-case';
import { GetSubscriptionUseCase } from './application/use-cases/get-subscription/get-subscription.use-case';
import { GetDueSubscriptionsInTimeframeUseCase } from './application/use-cases/get-due-subscriptions-in-timeframe/get-due-subscriptions-in-timeframe.use-case';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionRecord]),
    UsersModule,
    InvitesModule,
  ],
  controllers: [SubscriptionsController],
  providers: [
    {
      provide: SubscriptionRepository,
      useClass: LocalSubscriptionsRepository,
    },
    SubscriptionMapper,
    SubscriptionResponseMapper,
    HasActiveSubscriptionUseCase,
    GetSubscriptionUseCase,
    GetDueSubscriptionsInTimeframeUseCase,
    CreateSubscriptionUseCase,
    CancelSubscriptionUseCase,
    UncancelSubscriptionUseCase,
  ],
  exports: [
    HasActiveSubscriptionUseCase,
    GetSubscriptionUseCase,
    GetDueSubscriptionsInTimeframeUseCase,
    CreateSubscriptionUseCase,
    CancelSubscriptionUseCase,
    UncancelSubscriptionUseCase,
  ],
})
export class SubscriptionsModule {}
