import { SetMetadata } from '@nestjs/common';

export const REQUIRE_USAGE_BASED_SUBSCRIPTION_KEY =
  'requiresUsageBasedSubscription';

/**
 * Marks routes that require the caller's organization to have an active
 * usage-based subscription. Access is denied (403) otherwise. Used for
 * usage-plan-only features such as credit limits.
 *
 * @example
 * ```typescript
 * @RequireUsageBasedSubscription()
 * @Controller('credit-limits')
 * export class CreditLimitsController {}
 * ```
 */
export const RequireUsageBasedSubscription = () =>
  SetMetadata(REQUIRE_USAGE_BASED_SUBSCRIPTION_KEY, true);
