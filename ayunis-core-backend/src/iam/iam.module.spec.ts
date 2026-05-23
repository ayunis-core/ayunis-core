import { APP_GUARD } from '@nestjs/core';
import type { Provider } from '@nestjs/common';
import { IamModule } from './iam.module';
import { JwtAuthGuard } from './authentication/application/guards/jwt-auth.guard';
import { IpAllowlistGuard } from './ip-allowlist/application/guards/ip-allowlist.guard';
import { EmailConfirmGuard } from './authorization/application/guards/email-confirm.guard';
import { RolesGuard } from './authorization/application/guards/roles.guard';
import { SystemRolesGuard } from './authorization/application/guards/system-roles.guard';
import { SubscriptionGuard } from './authorization/application/guards/subscription.guard';
import { RateLimitGuard } from './authorization/application/guards/rate-limit.guard';

type GuardRef = abstract new (...args: never[]) => unknown;

/**
 * Global guard execution order is load-bearing: any guard that reads
 * `request.user` must run AFTER JwtAuthGuard, which populates it.
 * IpAllowlistGuard in particular fails OPEN (returns true) when request.user is
 * absent, so running it before JwtAuthGuard silently disables the org IP
 * allowlist. These tests pin the order declared in IamModule.providers so the
 * scanner-order trap documented in commit f407b691 cannot silently regress.
 */
describe('IamModule global guard order', () => {
  function appGuardOrder(): GuardRef[] {
    const { providers = [] } = IamModule.register();

    return (providers as Provider[]).flatMap((provider) => {
      const isAppGuardBinding =
        typeof provider === 'object' &&
        'provide' in provider &&
        provider.provide === APP_GUARD;

      if (!isAppGuardBinding) {
        return [];
      }

      const guard =
        ('useExisting' in provider ? provider.useExisting : undefined) ??
        ('useClass' in provider ? provider.useClass : undefined);

      return guard ? [guard as GuardRef] : [];
    });
  }

  it('binds every APP_GUARD in the intended order', () => {
    expect(appGuardOrder()).toEqual([
      JwtAuthGuard,
      IpAllowlistGuard,
      EmailConfirmGuard,
      RolesGuard,
      SystemRolesGuard,
      SubscriptionGuard,
      RateLimitGuard,
    ]);
  });

  it('runs JwtAuthGuard before IpAllowlistGuard so the allowlist can read request.user', () => {
    const order = appGuardOrder();

    expect(order.indexOf(JwtAuthGuard)).toBeGreaterThanOrEqual(0);
    expect(order.indexOf(JwtAuthGuard)).toBeLessThan(
      order.indexOf(IpAllowlistGuard),
    );
  });
});
