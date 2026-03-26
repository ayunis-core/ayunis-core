import { randomUUID } from 'crypto';
import { mapSubscriptionToWebhookPayload } from './subscription-payload.mapper';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';

describe('mapSubscriptionToWebhookPayload', () => {
  it('should map startsAt for seat-based subscriptions', () => {
    const subscriptionId = randomUUID();
    const orgId = randomUUID();
    const startsAt = new Date('2026-02-01T00:00:00.000Z');
    const renewalCycleAnchor = new Date('2026-02-01T00:00:00.000Z');
    const cancelledAt = new Date('2026-03-01T12:00:00.000Z');
    const createdAt = new Date('2026-01-15T09:00:00.000Z');
    const updatedAt = new Date('2026-01-20T10:30:00.000Z');

    const result = mapSubscriptionToWebhookPayload({
      id: subscriptionId,
      orgId,
      type: SubscriptionType.SEAT_BASED,
      startsAt,
      cancelledAt,
      createdAt,
      updatedAt,
      noOfSeats: 12,
      pricePerSeat: 19.5,
      renewalCycle: RenewalCycle.YEARLY,
      renewalCycleAnchor,
    });

    expect(result).toEqual({
      id: subscriptionId,
      orgId,
      type: 'SEAT_BASED',
      startsAt: startsAt.toISOString(),
      cancelledAt: cancelledAt.toISOString(),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      noOfSeats: 12,
      pricePerSeat: 19.5,
      renewalCycle: RenewalCycle.YEARLY,
      renewalCycleAnchor: renewalCycleAnchor.toISOString(),
    });
  });

  it('should map startsAt for usage-based subscriptions', () => {
    const subscriptionId = randomUUID();
    const orgId = randomUUID();
    const startsAt = new Date('2026-04-01T00:00:00.000Z');
    const createdAt = new Date('2026-03-10T08:15:00.000Z');
    const updatedAt = new Date('2026-03-18T13:45:00.000Z');

    const result = mapSubscriptionToWebhookPayload({
      id: subscriptionId,
      orgId,
      type: SubscriptionType.USAGE_BASED,
      startsAt,
      cancelledAt: null,
      createdAt,
      updatedAt,
      monthlyCredits: 750,
    });

    expect(result).toEqual({
      id: subscriptionId,
      orgId,
      type: 'USAGE_BASED',
      startsAt: startsAt.toISOString(),
      cancelledAt: null,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      monthlyCredits: 750,
    });
  });
});
