import { randomUUID } from 'crypto';
import { isActive } from './is-active';
import { SeatBasedSubscription } from '../../domain/seat-based-subscription.entity';
import { UsageBasedSubscription } from '../../domain/usage-based-subscription.entity';
import { SubscriptionBillingInfo } from '../../domain/subscription-billing-info.entity';
import { RenewalCycle } from '../../domain/value-objects/renewal-cycle.enum';

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
  }> = {},
): SeatBasedSubscription {
  return new SeatBasedSubscription({
    orgId: randomUUID(),
    noOfSeats: 10,
    pricePerSeat: 9.99,
    renewalCycle: RenewalCycle.MONTHLY,
    renewalCycleAnchor: overrides.renewalCycleAnchor ?? new Date('2025-01-01'),
    cancelledAt: overrides.cancelledAt ?? null,
    billingInfo: createBillingInfo(),
  });
}

function createUsageBased(
  overrides: Partial<{ cancelledAt: Date | null }> = {},
): UsageBasedSubscription {
  return new UsageBasedSubscription({
    orgId: randomUUID(),
    monthlyCredits: 1000,
    cancelledAt: overrides.cancelledAt ?? null,
    billingInfo: createBillingInfo(),
  });
}

describe('isActive', () => {
  it('should return true for a non-cancelled seat-based subscription', () => {
    expect(isActive(createSeatBased())).toBe(true);
  });

  it('should return true for a non-cancelled usage-based subscription', () => {
    expect(isActive(createUsageBased())).toBe(true);
  });

  it('should return false for a cancelled usage-based subscription', () => {
    expect(isActive(createUsageBased({ cancelledAt: new Date() }))).toBe(false);
  });

  it('should return true for a cancelled seat-based subscription still within billing period', () => {
    // Cancelled yesterday, anchor is 1st of this month — still in current period
    const now = new Date();
    const anchor = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const cancelledAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(
      isActive(createSeatBased({ cancelledAt, renewalCycleAnchor: anchor })),
    ).toBe(true);
  });

  it('should return false for a cancelled seat-based subscription past billing period', () => {
    // Cancelled 2 months ago with an old anchor
    const cancelledAt = new Date('2024-01-15');
    const anchor = new Date('2024-01-01');
    expect(
      isActive(createSeatBased({ cancelledAt, renewalCycleAnchor: anchor })),
    ).toBe(false);
  });
});
