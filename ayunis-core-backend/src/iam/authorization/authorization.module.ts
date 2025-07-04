import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './application/guards/roles.guard';
import { SubscriptionGuard } from './application/guards/subscription.guard';
import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [SubscriptionsModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SubscriptionGuard,
    },
  ],
  exports: [],
})
export class AuthorizationModule {}
