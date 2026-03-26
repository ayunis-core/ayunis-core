import { randomUUID } from 'crypto';
import { toSubscriptionEventData } from './to-subscription-event-data.mapper';
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

describe('toSubscriptionEventData', () => {
  describe('seat-based subscription', () => {
    it('should map all seat-based fields correctly', () => {
      const orgId = randomUUID();
      const anchor = new Date('2025-06-15T00:00:00.000Z');
      const startsAt = new Date('2025-05-01T00:00:00.000Z');
      const cancelledAt = new Date('2025-07-01T10:00:00.000Z');
      const sub = new SeatBasedSubscription({
        orgId,
        noOfSeats: 10,
        pricePerSeat: 9.99,
        renewalCycle: RenewalCycle.YEARLY,
        renewalCycleAnchor: anchor,
        startsAt,
        cancelledAt,
        billingInfo: createBillingInfo(),
      });

      const result = toSubscriptionEventData(sub);

      expect(result).toEqual({
        id: sub.id,
        orgId,
        type: SubscriptionType.SEAT_BASED,
        cancelledAt,
        startsAt,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
        noOfSeats: 10,
        pricePerSeat: 9.99,
        renewalCycle: RenewalCycle.YEARLY,
        renewalCycleAnchor: anchor,
      });
    });

    it('should preserve null cancelledAt', () => {
      const sub = new SeatBasedSubscription({
        orgId: randomUUID(),
        noOfSeats: 5,
        pricePerSeat: 12.0,
        renewalCycle: RenewalCycle.MONTHLY,
        renewalCycleAnchor: new Date('2025-01-01'),
        billingInfo: createBillingInfo(),
      });

      const result = toSubscriptionEventData(sub);

      expect(result.cancelledAt).toBeNull();
    });

    it('should preserve Date objects instead of converting to strings', () => {
      const sub = new SeatBasedSubscription({
        orgId: randomUUID(),
        noOfSeats: 3,
        pricePerSeat: 19.99,
        renewalCycle: RenewalCycle.YEARLY,
        renewalCycleAnchor: new Date('2025-03-01'),
        billingInfo: createBillingInfo(),
      });

      const result = toSubscriptionEventData(sub);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      if (result.type === SubscriptionType.SEAT_BASED) {
        expect(result.renewalCycleAnchor).toBeInstanceOf(Date);
      }
    });
  });

  describe('usage-based subscription', () => {
    it('should map all usage-based fields correctly', () => {
      const orgId = randomUUID();
      const startsAt = new Date('2025-08-01T00:00:00.000Z');
      const cancelledAt = new Date('2025-08-10T14:30:00.000Z');
      const sub = new UsageBasedSubscription({
        orgId,
        monthlyCredits: 500,
        startsAt,
        cancelledAt,
        billingInfo: createBillingInfo(),
      });

      const result = toSubscriptionEventData(sub);

      expect(result).toEqual({
        id: sub.id,
        orgId,
        type: SubscriptionType.USAGE_BASED,
        cancelledAt,
        startsAt,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
        monthlyCredits: 500,
      });
    });

    it('should not include seat-based fields for usage-based subscriptions', () => {
      const sub = new UsageBasedSubscription({
        orgId: randomUUID(),
        monthlyCredits: 1000,
        billingInfo: createBillingInfo(),
      });

      const result = toSubscriptionEventData(sub);

      expect(result).not.toHaveProperty('noOfSeats');
      expect(result).not.toHaveProperty('pricePerSeat');
      expect(result).not.toHaveProperty('renewalCycle');
      expect(result).not.toHaveProperty('renewalCycleAnchor');
    });
  });
});
