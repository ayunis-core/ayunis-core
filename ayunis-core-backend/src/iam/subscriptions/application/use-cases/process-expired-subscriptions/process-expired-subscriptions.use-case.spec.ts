jest.mock('@nestjs-cls/transactional', () => ({
  Propagation: { RequiresNew: 'RequiresNew' },
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { SubscriptionExpiredEvent } from 'src/iam/subscriptions/application/events/subscription-expired.event';
import type { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import { UnexpectedSubscriptionError } from 'src/iam/subscriptions/application/subscription.errors';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import { ProcessExpiredSubscriptionsUseCase } from './process-expired-subscriptions.use-case';

function expiredTrial(orgId = randomUUID()): UsageBasedSubscription {
  return new UsageBasedSubscription({
    orgId,
    monthlyCredits: 500,
    startsAt: new Date('2026-07-01T00:00:00.000Z'),
    endsAt: new Date('2026-10-01T00:00:00.000Z'),
    originalEndsAt: new Date('2026-10-01T00:00:00.000Z'),
    billingInfo: new SubscriptionBillingInfo({
      companyName: 'Stadt Beispielhausen',
      street: 'Rathausplatz',
      houseNumber: '1',
      postalCode: '54321',
      city: 'Beispielhausen',
      country: 'DE',
    }),
  });
}

function onExpiry(
  emitter: EventEmitter2,
  listener: (event: SubscriptionExpiredEvent) => unknown,
): void {
  emitter.on(SubscriptionExpiredEvent.EVENT_NAME, listener);
}

describe('ProcessExpiredSubscriptionsUseCase', () => {
  const first = expiredTrial();
  const second = expiredTrial();
  let repository: {
    findUnprocessedExpiryIds: jest.Mock;
    claimUnprocessedExpiry: jest.Mock;
  };
  let emitter: EventEmitter2;
  let useCase: ProcessExpiredSubscriptionsUseCase;

  beforeEach(() => {
    repository = {
      findUnprocessedExpiryIds: jest
        .fn()
        .mockResolvedValue([first.id, second.id]),
      claimUnprocessedExpiry: jest
        .fn()
        .mockImplementation(
          async (id) =>
            [first, second].find((subscription) => subscription.id === id) ??
            null,
        ),
    };
    emitter = new EventEmitter2();
    useCase = new ProcessExpiredSubscriptionsUseCase(
      repository as unknown as SubscriptionRepository,
      emitter,
    );
  });

  it('announces each claimed expiry with its effective end', async () => {
    const seen: SubscriptionExpiredEvent[] = [];
    onExpiry(emitter, (event) => seen.push(event));
    await expect(useCase.execute()).resolves.toBe(2);
    expect(seen.map(({ payload }) => payload.id)).toEqual([
      first.id,
      second.id,
    ]);
    expect(seen[0].payload).toMatchObject({
      type: SubscriptionType.USAGE_BASED,
      cancelledAt: null,
      endsAt: first.endsAt,
    });
  });

  it('announces nothing when no term has expired', async () => {
    repository.findUnprocessedExpiryIds.mockResolvedValue([]);
    await expect(useCase.execute()).resolves.toBe(0);
  });

  it('does not announce a term claimed by another sweep or cancelled since the scan', async () => {
    repository.claimUnprocessedExpiry.mockResolvedValue(null);
    const seen = jest.fn();
    onExpiry(emitter, seen);
    await expect(useCase.execute()).resolves.toBe(0);
    expect(seen).not.toHaveBeenCalled();
  });

  it('reports a failed listener after processing independent expiries', async () => {
    const seen: string[] = [];
    onExpiry(emitter, async (event: SubscriptionExpiredEvent) => {
      seen.push(event.payload.id);
      if (event.payload.id === first.id) throw new Error('receiver down');
    });
    await expect(useCase.execute()).rejects.toBeInstanceOf(
      UnexpectedSubscriptionError,
    );
    expect(seen).toEqual([first.id, second.id]);
  });

  it('does not leave other listeners running after a failure rolls back the transaction', async () => {
    const seen: string[] = [];
    onExpiry(emitter, async () => {
      throw new Error('receiver down');
    });
    onExpiry(emitter, async () => {
      seen.push('cleanup');
    });
    await expect(useCase.execute()).rejects.toBeInstanceOf(
      UnexpectedSubscriptionError,
    );
    expect(seen).toEqual([]);
  });

  it('wraps a failing scan in the module error', async () => {
    repository.findUnprocessedExpiryIds.mockRejectedValue(
      new Error('connection reset'),
    );
    await expect(useCase.execute()).rejects.toBeInstanceOf(
      UnexpectedSubscriptionError,
    );
  });
});
