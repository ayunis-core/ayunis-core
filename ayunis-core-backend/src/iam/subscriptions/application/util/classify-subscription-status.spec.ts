import { randomUUID } from 'crypto';
import { classifySubscriptionStatus } from './classify-subscription-status';
import { SubscriptionLifecycleStatus } from 'src/iam/subscriptions/domain/value-objects/subscription-lifecycle-status.enum';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
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
    renewalCycle: RenewalCycle.MONTHLY,
    renewalCycleAnchor: anchor,
    cancelledAt: overrides.cancelledAt ?? null,
    startsAt: overrides.startsAt ?? anchor,
    billingInfo: createBillingInfo(),
  });
}

function createUsageBased(
  overrides: Partial<{
    cancelledAt: Date | null;
    startsAt: Date;
  }> = {},
): UsageBasedSubscription {
  return new UsageBasedSubscription({
    orgId: randomUUID(),
    monthlyCredits: 1000,
    cancelledAt: overrides.cancelledAt ?? null,
    startsAt: overrides.startsAt ?? new Date('2025-01-01'),
    billingInfo: createBillingInfo(),
  });
}

describe('classifySubscriptionStatus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('classifies an uncancelled started subscription as active', () => {
    expect(classifySubscriptionStatus(createSeatBased())).toBe(
      SubscriptionLifecycleStatus.ACTIVE,
    );
  });

  it('classifies a future uncancelled subscription as scheduled', () => {
    const futureStart = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    expect(
      classifySubscriptionStatus(createSeatBased({ startsAt: futureStart })),
    ).toBe(SubscriptionLifecycleStatus.SCHEDULED);
  });

  it('classifies a cancelled seat-based subscription still in period as cancelled', () => {
    const now = new Date();
    const anchor = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const cancelledAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(
      classifySubscriptionStatus(
        createSeatBased({ cancelledAt, renewalCycleAnchor: anchor }),
      ),
    ).toBe(SubscriptionLifecycleStatus.CANCELLED);
  });

  it('classifies a cancelled seat-based subscription past its period as historical', () => {
    expect(
      classifySubscriptionStatus(
        createSeatBased({
          cancelledAt: new Date('2024-01-15'),
          renewalCycleAnchor: new Date('2024-01-01'),
        }),
      ),
    ).toBe(SubscriptionLifecycleStatus.HISTORICAL);
  });

  it('classifies a cancelled usage-based subscription as historical', () => {
    expect(
      classifySubscriptionStatus(createUsageBased({ cancelledAt: new Date() })),
    ).toBe(SubscriptionLifecycleStatus.HISTORICAL);
  });

  it('classifies a subscription cancelled before it started as historical', () => {
    const futureStart = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    expect(
      classifySubscriptionStatus(
        createSeatBased({
          startsAt: futureStart,
          renewalCycleAnchor: futureStart,
          cancelledAt: new Date(),
        }),
      ),
    ).toBe(SubscriptionLifecycleStatus.HISTORICAL);
  });
});
