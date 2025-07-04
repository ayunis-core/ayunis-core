import { SetMetadata } from '@nestjs/common';

export const REQUIRE_SUBSCRIPTION_KEY = 'requiresSubscription';

/**
 * Decorator to mark routes that require an active subscription
 *
 * @example
 * ```typescript
 * @RequireSubscription()
 * @Get('premium-feature')
 * async getPremiumFeature() {
 *   // This endpoint requires an active subscription
 * }
 * ```
 */
export const RequireSubscription = () =>
  SetMetadata(REQUIRE_SUBSCRIPTION_KEY, true);
