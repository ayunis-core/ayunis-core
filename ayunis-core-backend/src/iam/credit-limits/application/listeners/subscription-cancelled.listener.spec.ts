import type { UUID } from 'crypto';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import type { SubscriptionCancelledEvent } from 'src/iam/subscriptions/application/events/subscription-cancelled.event';
import type { RemoveOrgCreditLimitsUseCase } from '../use-cases/remove-org-credit-limits/remove-org-credit-limits.use-case';
import { SubscriptionCancelledListener } from './subscription-cancelled.listener';

describe('SubscriptionCancelledListener', () => {
  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  let removeOrgCreditLimits: { execute: jest.Mock };
  let listener: SubscriptionCancelledListener;

  const eventWith = (type: SubscriptionType): SubscriptionCancelledEvent =>
    ({ orgId, payload: { type } }) as unknown as SubscriptionCancelledEvent;

  beforeEach(() => {
    removeOrgCreditLimits = { execute: jest.fn() };
    listener = new SubscriptionCancelledListener(
      removeOrgCreditLimits as unknown as RemoveOrgCreditLimitsUseCase,
    );
  });

  it('clears credit limits when a usage-based subscription is cancelled', async () => {
    await listener.handleSubscriptionCancelled(
      eventWith(SubscriptionType.USAGE_BASED),
    );

    expect(removeOrgCreditLimits.execute).toHaveBeenCalledTimes(1);
  });

  it('ignores seat-based cancellations', async () => {
    await listener.handleSubscriptionCancelled(
      eventWith(SubscriptionType.SEAT_BASED),
    );

    expect(removeOrgCreditLimits.execute).not.toHaveBeenCalled();
  });
});
