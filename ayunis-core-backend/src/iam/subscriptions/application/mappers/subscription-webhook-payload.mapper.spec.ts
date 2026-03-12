import { randomUUID } from 'crypto';
import { toSubscriptionWebhookPayload } from './subscription-webhook-payload.mapper';
import { SeatBasedSubscription } from '../../domain/seat-based-subscription.entity';
import { UsageBasedSubscription } from '../../domain/usage-based-subscription.entity';
import { SubscriptionBillingInfo } from '../../domain/subscription-billing-info.entity';
import { RenewalCycle } from '../../domain/value-objects/renewal-cycle.enum';
import { SubscriptionType } from '../../domain/value-objects/subscription-type.enum';

function createBillingInfo(): SubscriptionBillingInfo {
  return new SubscriptionBillingInfo({
    companyName: 'Gemeinde Musterstadt',
    street: 'Hauptstraße',
    houseNumber: '1',
    postalCode: '12345',
    city: 'Musterstadt',
    country: 'DE',
  });
}

describe('toSubscriptionWebhookPayload', () => {
  it('should include type discriminator for seat-based subscription', () => {
    const sub = new SeatBasedSubscription({
      orgId: randomUUID(),
      noOfSeats: 10,
      pricePerSeat: 9.99,
      renewalCycle: RenewalCycle.MONTHLY,
      renewalCycleAnchor: new Date('2025-01-01'),
      billingInfo: createBillingInfo(),
    });

    const payload = toSubscriptionWebhookPayload(sub);

    expect(payload.type).toBe(SubscriptionType.SEAT_BASED);
    expect(payload).toHaveProperty('noOfSeats', 10);
    expect(payload).toHaveProperty('pricePerSeat', 9.99);
    expect(payload).toHaveProperty('renewalCycle', RenewalCycle.MONTHLY);
    expect(payload).toHaveProperty('renewalCycleAnchor');
  });

  it('should include type discriminator for usage-based subscription', () => {
    const sub = new UsageBasedSubscription({
      orgId: randomUUID(),
      monthlyCredits: 500,
      billingInfo: createBillingInfo(),
    });

    const payload = toSubscriptionWebhookPayload(sub);

    expect(payload.type).toBe(SubscriptionType.USAGE_BASED);
    expect(payload).toHaveProperty('monthlyCredits', 500);
    expect(payload).not.toHaveProperty('noOfSeats');
    expect(payload).not.toHaveProperty('pricePerSeat');
  });

  it('should serialize dates as ISO strings', () => {
    const sub = new SeatBasedSubscription({
      orgId: randomUUID(),
      noOfSeats: 5,
      pricePerSeat: 12.0,
      renewalCycle: RenewalCycle.YEARLY,
      renewalCycleAnchor: new Date('2025-06-15T00:00:00.000Z'),
      billingInfo: createBillingInfo(),
    });

    const payload = toSubscriptionWebhookPayload(sub);

    expect(typeof payload.createdAt).toBe('string');
    expect(typeof payload.updatedAt).toBe('string');
    expect(payload.cancelledAt).toBeNull();
  });

  it('should serialize cancelledAt when present', () => {
    const cancelledAt = new Date('2025-03-01T12:00:00.000Z');
    const sub = new UsageBasedSubscription({
      orgId: randomUUID(),
      monthlyCredits: 100,
      cancelledAt,
      billingInfo: createBillingInfo(),
    });

    const payload = toSubscriptionWebhookPayload(sub);

    expect(payload.cancelledAt).toBe('2025-03-01T12:00:00.000Z');
  });
});
