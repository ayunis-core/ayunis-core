import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import type { SubscriptionCancelledEvent } from 'src/iam/subscriptions/application/events/subscription-cancelled.event';
import type { SubscriptionExpiredEvent } from 'src/iam/subscriptions/application/events/subscription-expired.event';
import type { IsUsageBasedSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/is-usage-based-subscription/is-usage-based-subscription.use-case';
import type { RemoveOrgCreditLimitsUseCase } from 'src/iam/credit-limits/application/use-cases/remove-org-credit-limits/remove-org-credit-limits.use-case';
import { TEST_ORG_ID } from 'src/iam/credit-limits/application/testing/credit-limit.fixtures';
import { SubscriptionEndedListener } from './subscription-ended.listener';

describe('SubscriptionEndedListener', () => {
  const orgId = TEST_ORG_ID;
  let removeOrgCreditLimits: { execute: jest.Mock };
  let isUsageBasedSubscription: { execute: jest.Mock };
  let listener: SubscriptionEndedListener;

  const eventWith = (type: SubscriptionType) =>
    ({ orgId, payload: { type } }) as unknown as SubscriptionCancelledEvent &
      SubscriptionExpiredEvent;

  beforeEach(() => {
    removeOrgCreditLimits = { execute: jest.fn() };
    isUsageBasedSubscription = { execute: jest.fn().mockResolvedValue(false) };
    listener = new SubscriptionEndedListener(
      removeOrgCreditLimits as unknown as RemoveOrgCreditLimitsUseCase,
      isUsageBasedSubscription as unknown as IsUsageBasedSubscriptionUseCase,
    );
  });

  it('clears credit limits when a usage-based subscription is cancelled', async () => {
    await listener.handleSubscriptionCancelled(
      eventWith(SubscriptionType.USAGE_BASED),
    );

    expect(removeOrgCreditLimits.execute).toHaveBeenCalledTimes(1);
  });

  it('clears credit limits when a usage-based fixed term runs out', async () => {
    await listener.handleSubscriptionExpired(
      eventWith(SubscriptionType.USAGE_BASED),
    );

    expect(removeOrgCreditLimits.execute).toHaveBeenCalledTimes(1);
  });

  it('keeps credit limits when a successor usage-based subscription already serves the org', async () => {
    isUsageBasedSubscription.execute.mockResolvedValue(true);

    await listener.handleSubscriptionExpired(
      eventWith(SubscriptionType.USAGE_BASED),
    );

    expect(isUsageBasedSubscription.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId }),
    );
    expect(removeOrgCreditLimits.execute).not.toHaveBeenCalled();
  });

  it('ignores seat-based cancellations', async () => {
    await listener.handleSubscriptionCancelled(
      eventWith(SubscriptionType.SEAT_BASED),
    );

    expect(removeOrgCreditLimits.execute).not.toHaveBeenCalled();
    expect(isUsageBasedSubscription.execute).not.toHaveBeenCalled();
  });

  it('ignores seat-based expiries', async () => {
    await listener.handleSubscriptionExpired(
      eventWith(SubscriptionType.SEAT_BASED),
    );

    expect(removeOrgCreditLimits.execute).not.toHaveBeenCalled();
  });
});
