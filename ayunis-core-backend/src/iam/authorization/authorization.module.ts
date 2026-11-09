import { Module } from '@nestjs/common';
import { RolesGuard } from './application/guards/roles.guard';
import { SubscriptionGuard } from './application/guards/subscription.guard';
import { RateLimitGuard } from 'src/common/guards/rate-limit.guard';
import { SubscriptionsModule } from 'src/iam/subscriptions/subscriptions.module';
import { TrialsModule } from 'src/iam/trials/trials.module';
import { AddonsModule } from 'src/iam/addons/addons.module';
import { PermissionsModule } from 'src/iam/permissions/permissions.module';
import { EmailConfirmGuard } from './application/guards/email-confirm.guard';
import { SystemRolesGuard } from './application/guards/system-roles.guard';
import { AddonGuard } from './application/guards/addon.guard';
import { PermissionsGuard } from './application/guards/permissions.guard';
import { UsageBasedSubscriptionGuard } from './application/guards/usage-based-subscription.guard';
import { AllowedClientsGuard } from './application/guards/allowed-clients.guard';

/**
 * Authorization guards live here as regular providers and are exported for
 * consumers. APP_GUARD bindings (which determine global guard execution
 * order) are owned by IamModule, so the order between authn and authz is
 * declared in one place rather than derived from module scan order.
 *
 * SubscriptionsModule and TrialsModule are re-exported so consumers that
 * apply SubscriptionGuard at the controller level via `@UseGuards
 * (SubscriptionGuard)` (e.g. OpenAICompatModule) get the guard's transitive
 * deps in their injector without having to know its internals — mirrors how
 * @nestjs/passport exposes its strategy module.
 */
@Module({
  imports: [SubscriptionsModule, TrialsModule, AddonsModule, PermissionsModule],
  providers: [
    EmailConfirmGuard,
    RolesGuard,
    SystemRolesGuard,
    SubscriptionGuard,
    RateLimitGuard,
    AddonGuard,
    PermissionsGuard,
    UsageBasedSubscriptionGuard,
    AllowedClientsGuard,
  ],
  exports: [
    EmailConfirmGuard,
    RolesGuard,
    SystemRolesGuard,
    SubscriptionGuard,
    RateLimitGuard,
    AddonGuard,
    PermissionsGuard,
    UsageBasedSubscriptionGuard,
    AllowedClientsGuard,
    SubscriptionsModule,
    TrialsModule,
    AddonsModule,
    PermissionsModule,
  ],
})
export class AuthorizationModule {}
