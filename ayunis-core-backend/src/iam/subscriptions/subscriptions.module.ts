import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HasActiveSubscriptionUseCase } from './application/use-cases/has-active-subscription/has-active-subscription.use-case';
import { GetActiveSubscriptionUseCase } from './application/use-cases/get-active-subscription/get-active-subscription.use-case';
import { GetLatestSubscriptionUseCase } from './application/use-cases/get-latest-subscription/get-latest-subscription.use-case';
import { CreateSubscriptionUseCase } from './application/use-cases/create-subscription/create-subscription.use-case';
import { CancelSubscriptionUseCase } from './application/use-cases/cancel-subscription/cancel-subscription.use-case';
import { UncancelSubscriptionUseCase } from './application/use-cases/uncancel-subscription/uncancel-subscription.use-case';
import { SubscriptionRepository } from './application/ports/subscription.repository';
import { LocalSubscriptionsRepository } from './infrastructure/persistence/local/local-subscriptions.repository';
import {
  SubscriptionRecord,
  SeatBasedSubscriptionRecord,
  UsageBasedSubscriptionRecord,
} from './infrastructure/persistence/local/schema/subscription.record';
import { SubscriptionMapper } from './infrastructure/persistence/local/mappers/subscription.mapper';
import { SubscriptionsController } from './presenters/http/subscriptions.controller';
import { SuperAdminSubscriptionsController } from './presenters/http/super-admin-subscriptions.controller';
import { SubscriptionResponseMapper } from './presenters/http/mappers/subscription-response.mapper';
import { UsersModule } from '../users/users.module';
import { InvitesModule } from '../invites/invites.module';
import { UpdateSeatsUseCase } from './application/use-cases/update-seats/update-seats.use-case';
import { UpdateBillingInfoUseCase } from './application/use-cases/update-billing-info/update-billing-info.use-case';
import { SubscriptionBillingInfoMapper } from './infrastructure/persistence/local/mappers/subscription-billing-info.mapper';
import { SubscriptionBillingInfoRecord } from './infrastructure/persistence/local/schema/subscription-billing-info.record';
import { GetCurrentPriceUseCase } from './application/use-cases/get-current-price/get-current-price.use-case';
import { GetMonthlyCreditLimitUseCase } from './application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.use-case';
import { IsUsageBasedSubscriptionUseCase } from './application/use-cases/is-usage-based-subscription/is-usage-based-subscription.use-case';
import { UpdateStartDateUseCase } from './application/use-cases/update-start-date/update-start-date.use-case';
import { UpdateMonthlyCreditsUseCase } from './application/use-cases/update-monthly-credits/update-monthly-credits.use-case';
import { ChangeSubscriptionUseCase } from './application/use-cases/change-subscription/change-subscription.use-case';
import { SubscriptionFactory } from './application/services/subscription-factory.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionRecord,
      SeatBasedSubscriptionRecord,
      UsageBasedSubscriptionRecord,
      SubscriptionBillingInfoRecord,
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => InvitesModule),
  ],
  controllers: [SubscriptionsController, SuperAdminSubscriptionsController],
  providers: [
    {
      provide: SubscriptionRepository,
      useClass: LocalSubscriptionsRepository,
    },
    SubscriptionMapper,
    SubscriptionResponseMapper,
    SubscriptionBillingInfoMapper,
    SubscriptionFactory,
    HasActiveSubscriptionUseCase,
    GetActiveSubscriptionUseCase,
    GetLatestSubscriptionUseCase,
    CreateSubscriptionUseCase,
    ChangeSubscriptionUseCase,
    CancelSubscriptionUseCase,
    UncancelSubscriptionUseCase,
    UpdateSeatsUseCase,
    UpdateBillingInfoUseCase,
    UpdateStartDateUseCase,
    UpdateMonthlyCreditsUseCase,
    GetCurrentPriceUseCase,
    GetMonthlyCreditLimitUseCase,
    IsUsageBasedSubscriptionUseCase,
  ],
  exports: [
    HasActiveSubscriptionUseCase,
    GetActiveSubscriptionUseCase,
    CreateSubscriptionUseCase,
    UpdateSeatsUseCase,
    GetMonthlyCreditLimitUseCase,
    IsUsageBasedSubscriptionUseCase,
  ],
})
export class SubscriptionsModule {}
