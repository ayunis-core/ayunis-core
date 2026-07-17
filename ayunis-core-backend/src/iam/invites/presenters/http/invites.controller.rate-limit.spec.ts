import { Reflector } from '@nestjs/core';
import { InvitesController } from './invites.controller';
import {
  RATE_LIMIT_KEY,
  type RateLimitOptions,
} from 'src/common/decorators/rate-limit.decorator';

describe('InvitesController rate limits', () => {
  const reflector = new Reflector();

  it('allows admins to create enough invites to onboard an organization (AYC-409)', () => {
    const options = reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      InvitesController.prototype.create,
    );

    expect(options).toBeDefined();
    // Regression guard: onboarding a whole org must not fail after ~10 invites.
    expect(options.limit).toBeGreaterThanOrEqual(100);
    expect(options.windowMs).toBe(15 * 60 * 1000);
  });
});
