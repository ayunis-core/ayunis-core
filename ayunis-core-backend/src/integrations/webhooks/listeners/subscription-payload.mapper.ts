import type { SubscriptionEventData } from 'src/iam/subscriptions/application/events/subscription-event-data.types';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import type {
  SubscriptionWebhookPayload,
  SeatBasedWebhookPayload,
  UsageBasedWebhookPayload,
} from '../domain/subscription-webhook-payload.types';

/**
 * Maps domain-level {@link SubscriptionEventData} to the webhook-specific
 * {@link SubscriptionWebhookPayload}. The main difference is that domain
 * types use `Date` objects while webhook payloads use ISO 8601 strings.
 */
export function mapSubscriptionToWebhookPayload(
  data: SubscriptionEventData,
): SubscriptionWebhookPayload {
  const base = {
    id: data.id,
    orgId: data.orgId,
    cancelledAt: data.cancelledAt?.toISOString() ?? null,
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
  };

  if (data.type === SubscriptionType.SEAT_BASED) {
    return {
      ...base,
      type: 'SEAT_BASED',
      noOfSeats: data.noOfSeats,
      pricePerSeat: data.pricePerSeat,
      renewalCycle: data.renewalCycle,
      renewalCycleAnchor: data.renewalCycleAnchor.toISOString(),
    } satisfies SeatBasedWebhookPayload;
  }

  return {
    ...base,
    type: 'USAGE_BASED',
    monthlyCredits: data.monthlyCredits,
  } satisfies UsageBasedWebhookPayload;
}
