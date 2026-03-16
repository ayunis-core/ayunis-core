import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './application/guards/roles.guard';
import { SubscriptionGuard } from './application/guards/subscription.guard';
import { RateLimitGuard } from './application/guards/rate-limit.guard';
import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TrialsModule } from '../trials/trials.module';
import { EmailConfirmGuard } from './application/guards/email-confirm.guard';
import { SystemRolesGuard } from './application/guards/system-roles.guard';
import { IpAllowlistModule } from '../ip-allowlist/ip-allowlist.module';
import { IpAllowlistGuard } from '../ip-allowlist/application/guards/ip-allowlist.guard';

@Module({
  imports: [SubscriptionsModule, TrialsModule, IpAllowlistModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: IpAllowlistGuard,
    },
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
      useClass: SystemRolesGuard,
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
