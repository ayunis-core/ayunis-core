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
        nextRenewalDate,
      }),
    ]);
  });
});
