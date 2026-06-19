import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthenticationModule } from './authentication/authentication.module';
import { InvitesModule } from './invites/invites.module';
import {
  authenticationConfig,
  AuthProvider,
} from '../config/authentication.config';
import { HashingModule } from './hashing/hashing.module';
import { UsersModule } from './users/users.module';
import { OrgsModule } from './orgs/orgs.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TrialsModule } from './trials/trials.module';
import { LegalAcceptancesModule } from './legal-acceptances/legal-acceptances.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { QuotasModule } from './quotas/quotas.module';
import { TeamsModule } from './teams/teams.module';
import { CreditLimitsModule } from './credit-limits/credit-limits.module';
import { PlatformConfigModule } from './platform-config/platform-config.module';
import { AddonsModule } from './addons/addons.module';
import { IpAllowlistModule } from './ip-allowlist/ip-allowlist.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { JwtAuthGuard } from './authentication/application/guards/jwt-auth.guard';
import { IpAllowlistGuard } from './ip-allowlist/application/guards/ip-allowlist.guard';
import { EmailConfirmGuard } from './authorization/application/guards/email-confirm.guard';
import { RolesGuard } from './authorization/application/guards/roles.guard';
import { SystemRolesGuard } from './authorization/application/guards/system-roles.guard';
import { SubscriptionGuard } from './authorization/application/guards/subscription.guard';
import { RateLimitGuard } from './authorization/application/guards/rate-limit.guard';
import { AddonGuard } from './authorization/application/guards/addon.guard';
import { UsageBasedSubscriptionGuard } from './authorization/application/guards/usage-based-subscription.guard';

// Feature modules re-exported by IamModule. Listed once and spread into both
// `imports` and `exports` so the two cannot drift out of sync.
const IAM_FEATURE_MODULES = [
  AuthorizationModule,
  HashingModule,
  InvitesModule,
  UsersModule,
  OrgsModule,
  SubscriptionsModule,
  TrialsModule,
  LegalAcceptancesModule,
  OnboardingModule,
  QuotasModule,
  TeamsModule,
  CreditLimitsModule,
  PlatformConfigModule,
  IpAllowlistModule,
  ApiKeysModule,
  AddonsModule,
];

// Global guard execution order is declared HERE — explicitly, in array
// order — rather than being derived from NestJS's module-scan order.
// Previously, JwtAuthGuard and the authorization guards each bound
// their own APP_GUARD in their respective modules; the resulting global
// guards array was ordered by DFS post-order of the module graph, so
// any commit that deepened an import chain (e.g. adding ApiKeysModule
// to AuthenticationModule so ApiKeyStrategy can inject
// ValidateApiKeyUseCase) silently re-shuffles the chain and can push
// JwtAuthGuard past the authz guards — at which point every protected
// route returns 403 because authz runs before request.user is populated.
// Centralizing the bindings here makes the order load-bearing and
// immune to scanner walking.
//
// ORDER IS LOAD-BEARING: JwtAuthGuard MUST run before every guard that
// reads request.user. In particular IpAllowlistGuard depends on
// request.user.orgId to look up the org's allowlist and fails OPEN
// (returns true) when request.user is absent — so if it runs before
// JwtAuthGuard the allowlist is silently disabled on every request.
const GLOBAL_GUARD_PROVIDERS = [
  { provide: APP_GUARD, useExisting: JwtAuthGuard },
  { provide: APP_GUARD, useExisting: IpAllowlistGuard },
  { provide: APP_GUARD, useExisting: EmailConfirmGuard },
  { provide: APP_GUARD, useExisting: RolesGuard },
  { provide: APP_GUARD, useExisting: SystemRolesGuard },
  { provide: APP_GUARD, useExisting: AddonGuard },
  { provide: APP_GUARD, useExisting: SubscriptionGuard },
  { provide: APP_GUARD, useExisting: UsageBasedSubscriptionGuard },
  { provide: APP_GUARD, useExisting: RateLimitGuard },
];

@Module({})
export class IamModule {
  static register(options?: { authProvider?: AuthProvider }) {
    return {
      module: IamModule,
      imports: [
        ConfigModule.forFeature(authenticationConfig),
        AuthenticationModule.register({
          provider: options?.authProvider,
        }),
        ...IAM_FEATURE_MODULES,
      ],
      providers: [...GLOBAL_GUARD_PROVIDERS],
      exports: [AuthenticationModule, ...IAM_FEATURE_MODULES],
    };
  }
}
