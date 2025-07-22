import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './application/guards/roles.guard';
import { SubscriptionGuard } from './application/guards/subscription.guard';
import { RateLimitGuard } from './application/guards/rate-limit.guard';
import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EmailConfirmGuard } from './application/guards/email-confirm.guard';

@Module({
  imports: [SubscriptionsModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: EmailConfirmGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SubscriptionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
  exports: [],
})
export class AuthorizationModule {}
