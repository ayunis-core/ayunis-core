import { randomUUID } from 'crypto';
import { getNextRenewalDate } from './get-next-renewal-date';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';

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

function createSeatBased(
  overrides: Partial<{
    cancelledAt: Date | null;
    renewalCycleAnchor: Date;
    startsAt: Date;
  }> = {},
): SeatBasedSubscription {
  const anchor = overrides.renewalCycleAnchor ?? new Date('2025-01-01');
  return new SeatBasedSubscription({
    orgId: randomUUID(),
    noOfSeats: 10,
    pricePerSeat: 9.99,
    renewalCycle: RenewalCycle.YEARLY,
    renewalCycleAnchor: anchor,
    cancelledAt: overrides.cancelledAt ?? null,
    startsAt: overrides.startsAt ?? anchor,
    billingInfo: createBillingInfo(),
  });
}

describe('getNextRenewalDate', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns startsAt for a seat-based subscription cancelled before start once that start date is in the past', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
    const startsAt = new Date('2026-01-01T00:00:00.000Z');

    expect(
      getNextRenewalDate(
        createSeatBased({
          startsAt,
          renewalCycleAnchor: startsAt,
          cancelledAt: new Date('2025-09-18T11:00:00.000Z'),
        }),
      ),
    ).toEqual(startsAt);
  });
});
