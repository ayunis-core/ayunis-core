import { randomUUID } from 'crypto';
import { SubscriptionResponseMapper } from './subscription-response.mapper';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { SubscriptionLifecycleStatus } from 'src/iam/subscriptions/domain/value-objects/subscription-lifecycle-status.enum';

describe('SubscriptionResponseMapper', () => {
  const mapper = new SubscriptionResponseMapper();
  const orgId = randomUUID();

  function createSeatBased(): SeatBasedSubscription {
    return new SeatBasedSubscription({
      orgId,
      noOfSeats: 8,
      pricePerSeat: 12.5,
      renewalCycle: RenewalCycle.YEARLY,
      renewalCycleAnchor: new Date('2025-01-01'),
      startsAt: new Date('2025-01-01'),
      endsAt: new Date('2026-08-01T00:00:00.000Z'),
      billingInfo: new SubscriptionBillingInfo({
        companyName: 'Gemeinde Musterstadt',
        street: 'Hauptstraße',
        houseNumber: '1',
        postalCode: '12345',
        city: 'Musterstadt',
        country: 'DE',
      }),
    });
  }

  it.each(['2026-08-01T00:00:00Z', '2027-01-01T00:00:00Z'])(
    'does not advertise a renewal at or after the exclusive end (%s)',
    (renewal) => {
      const subscription = createSeatBased();
      const result = mapper.toDto({
        subscription,
        availableSeats: 8,
        nextRenewalDate: new Date(renewal),
      });
      expect(result.nextRenewalDate).toBeNull();
      expect(result.endsAt).toEqual(subscription.endsAt);
    },
  );

  it('preserves the cycle date for an open-ended subscription', () => {
    const subscription = createSeatBased();
    subscription.endsAt = null;
    const nextRenewalDate = new Date('2027-01-01');
    expect(
      mapper.toDto({ subscription, availableSeats: 8, nextRenewalDate })
        .nextRenewalDate,
    ).toEqual(nextRenewalDate);
  });

  it('maps history items with status and latest flag without computing seats', () => {
    const subscription = createSeatBased();
    const nextRenewalDate = new Date('2026-01-01');

    const result = mapper.toHistoryResponse({
      subscriptions: [
        {
          subscription,
          status: SubscriptionLifecycleStatus.ACTIVE,
          isLatest: true,
          nextRenewalDate,
        },
      ],
      activeCount: 1,
    });

    expect(result.activeCount).toBe(1);
    expect(result.subscriptions).toEqual([
      expect.objectContaining({
        id: subscription.id,
        orgId,
        type: subscription.type,
        noOfSeats: 8,
        availableSeats: null,
        status: SubscriptionLifecycleStatus.ACTIVE,
        isLatest: true,
        endsAt: new Date('2026-08-01T00:00:00.000Z'),
        nextRenewalDate,
      }),
    ]);
  });
});
