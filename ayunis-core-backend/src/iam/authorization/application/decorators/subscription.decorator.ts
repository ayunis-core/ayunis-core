import { SetMetadata } from '@nestjs/common';
import type { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';

export const REQUIRE_SUBSCRIPTION_KEY = 'requiresSubscription';

export interface RequireSubscriptionOptions {
  /**
   * Restrict the subscription branch of the gate to subscriptions of this type.
   * The trial fallback still applies regardless. When omitted, any active
   * subscription satisfies the gate.
   */
  type?: SubscriptionType;
}

/**
 * Decorator to mark routes that require an active subscription (or trial with
 * remaining messages).
 *
 * @example
 * ```typescript
 * @RequireSubscription()
 * @Post('chat')
 * sendMessage() {}
 *
 * @RequireSubscription({ type: SubscriptionType.USAGE_BASED })
 * @Post('v1/chat/completions')
 * apiCompletion() {}
 * ```
 */
export const RequireSubscription = (options: RequireSubscriptionOptions = {}) =>
  SetMetadata(REQUIRE_SUBSCRIPTION_KEY, options);
