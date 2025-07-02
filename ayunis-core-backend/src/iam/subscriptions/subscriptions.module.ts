import { Module } from '@nestjs/common';
import { HasActiveSubscriptionUseCase } from './application/use-cases/has-active-subscription/has-active-subscription.use-case';
import { GetNextBillingDateUseCase } from './application/use-cases/get-next-billing-date/get-next-billing-date.use-case';
import { SubscriptionRepository } from './application/ports/subscription.repository';
import { LocalSubscriptionsRepository } from './infrastructure/persistence/local/local-subscriptions.repository';

@Module({
  providers: [
    {
      provide: SubscriptionRepository,
      useClass: LocalSubscriptionsRepository,
    },
    HasActiveSubscriptionUseCase,
    GetNextBillingDateUseCase,
  ],
})
export class SubscriptionsModule {}
