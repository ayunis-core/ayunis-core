import type { Subscription } from '../../domain/subscription.entity';
import {
  isSeatBased,
  isUsageBased,
} from '../../domain/subscription-type-guards';
import { SubscriptionType } from '../../domain/value-objects/subscription-type.enum';
import { assertNever } from 'src/common/util/assert-never';
import type {
  SubscriptionWebhookPayload,
  SubscriptionWebhookPayloadBase,
} from 'src/common/webhooks/domain/subscription-webhook-payload.types';

export type {
  SubscriptionWebhookPayload,
  SeatBasedWebhookPayload,
  UsageBasedWebhookPayload,
  BillingInfoPayload,
} from 'src/common/webhooks/domain/subscription-webhook-payload.types';

export function toSubscriptionWebhookPayload(
  subscription: Subscription,
): SubscriptionWebhookPayload {
  const base: SubscriptionWebhookPayloadBase = {
    id: subscription.id,
    orgId: subscription.orgId,
    type: subscription.type,
    cancelledAt: subscription.cancelledAt?.toISOString() ?? null,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
  };

  if (isSeatBased(subscription)) {
    return {
      ...base,
      type: SubscriptionType.SEAT_BASED,
      noOfSeats: subscription.noOfSeats,
      pricePerSeat: subscription.pricePerSeat,
      renewalCycle: subscription.renewalCycle,
      renewalCycleAnchor: subscription.renewalCycleAnchor.toISOString(),
    };
  }

  if (isUsageBased(subscription)) {
    return {
      ...base,
      type: SubscriptionType.USAGE_BASED,
      monthlyCredits: subscription.monthlyCredits,
    };
  }

  return assertNever(subscription as never);
}
