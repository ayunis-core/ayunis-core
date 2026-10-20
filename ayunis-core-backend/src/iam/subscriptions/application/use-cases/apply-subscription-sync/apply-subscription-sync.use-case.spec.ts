import type { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { ApplySubscriptionSyncUseCase } from './apply-subscription-sync.use-case';
import type { SubscriptionSyncState } from 'src/iam/subscriptions/application/models/subscription-sync-state';
import { SubscriptionFactory } from 'src/iam/subscriptions/application/services/subscription-factory.service';
import type { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import type { ReplaceSubscriptionParams } from 'src/iam/subscriptions/application/ports/subscription.repository';
import type { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import type { CountPendingInvitesByOrgIdUseCase } from 'src/iam/invites/application/use-cases/count-pending-invites-by-org-id/count-pending-invites-by-org-id.use-case';
import type { CountUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/count-users-by-org-id/count-users-by-org-id.use-case';
import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import { isActive } from 'src/iam/subscriptions/application/util/is-active';
import { cloneSubscriptionWithType } from 'src/iam/subscriptions/application/services/subscription-sync-data';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

describe('Applying a complete external subscription state', () => {
  const orgId = randomUUID();
  const billing = {
    companyName: 'Example Municipality',
    street: 'Town Hall Street',
    houseNumber: '1',
    postalCode: '10115',
    city: 'Berlin',
    country: 'DE',
  };
  const started = new Date('2026-09-01T00:00:00Z');
  let stored: Subscription[];
  let useCase: ApplySubscriptionSyncUseCase;
  let repository: SubscriptionRepository;
  let state: SubscriptionSyncState;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-20T12:00:00Z'));
    stored = [];
    repository = {
      findByOrgId: async () => stored.map(cloneSubscriptionWithType),
      create: async (subscription: Subscription) => {
        stored.push(cloneSubscriptionWithType(subscription));
        return subscription;
      },
      update: async (subscription: Subscription) => {
        stored = stored.map((entry) =>
          entry.id === subscription.id
            ? cloneSubscriptionWithType(subscription)
            : entry,
        );
        return subscription;
      },
      replace: async ({
        oldSubscriptionId,
        oldAccessEndsAt,
        newSubscription,
      }: ReplaceSubscriptionParams) => {
        const old = stored.find((entry) => entry.id === oldSubscriptionId)!;
        old.accessEndsAt = oldAccessEndsAt;
        old.cancelledAt ??= new Date();
        stored.push(cloneSubscriptionWithType(newSubscription));
        return newSubscription;
      },
    } as unknown as SubscriptionRepository;
    const factory = new SubscriptionFactory(
      { get: () => 18 } as unknown as ConfigService,
      {
        execute: async () => 2,
      } as unknown as CountPendingInvitesByOrgIdUseCase,
      { execute: async () => 3 } as unknown as CountUsersByOrgIdUseCase,
    );
    useCase = new ApplySubscriptionSyncUseCase(repository, factory, {
      execute: async () => undefined,
    } as unknown as AcquireSeatAllocationLockUseCase);
    state = {
      orgId,
      academyActive: false,
      subscription: {
        type: SubscriptionType.USAGE_BASED,
        monthlyCredits: 20_750_000,
        startsAt: started,
        cancelledAt: null,
        accessEndsAt: null,
        billingInfo: billing,
      },
    };
  });

  afterEach(() => jest.useRealTimers());

  function existing(): UsageBasedSubscription {
    return new UsageBasedSubscription({
      orgId,
      startsAt: started,
      monthlyCredits: 10_375_000,
      billingInfo: new SubscriptionBillingInfo(billing),
    });
  }

  it('creates one subscription and returns the existing creation event', async () => {
    const result = await useCase.execute(state);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ monthlyCredits: 20_750_000, orgId });
    expect(result.events.map((event) => event.name)).toEqual([
      'subscription.created',
    ]);
  });

  it('does not write or return events when the same state is applied again', async () => {
    await useCase.execute(state);
    const before = structuredClone(stored);
    const result = await useCase.execute(state);
    expect(result.changed).toBe(false);
    expect(result.events).toEqual([]);
    expect(stored).toEqual(before);
  });

  it('updates credits in place and returns the event consumed by StartDeliver', async () => {
    const current = existing();
    stored.push(current);
    const result = await useCase.execute(state);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      id: current.id,
      monthlyCredits: 20_750_000,
    });
    expect(result.events.map((event) => event.name)).toEqual([
      'subscription.monthly-credits-updated',
    ]);
  });

  it('retains access until the explicit future cancellation date', async () => {
    stored.push(existing());
    state.subscription!.cancelledAt = new Date('2026-10-19T12:00:00Z');
    state.subscription!.accessEndsAt = new Date('2027-10-15T00:00:00Z');
    await useCase.execute(state);
    expect(stored[0].accessEndsAt).toEqual(new Date('2027-10-15T00:00:00Z'));
    expect(isActive(stored[0])).toBe(true);
  });

  it('terminates access immediately and keeps the historical record', async () => {
    const current = existing();
    stored.push(current);
    state.subscription = null;
    const result = await useCase.execute(state);
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(current.id);
    expect(isActive(stored[0])).toBe(false);
    expect(result.events.map((event) => event.name)).toEqual([
      'subscription.cancelled',
    ]);
    expect((await useCase.execute(state)).changed).toBe(false);
  });

  it('resumes the same contract and clears stale cancellation boundaries', async () => {
    const current = existing();
    current.cancelledAt = new Date('2026-10-19T00:00:00Z');
    current.accessEndsAt = new Date('2026-10-19T00:00:00Z');
    stored.push(current);
    const result = await useCase.execute(state);
    expect(stored[0]).toMatchObject({
      id: current.id,
      cancelledAt: null,
      accessEndsAt: null,
    });
    expect(isActive(stored[0])).toBe(true);
    expect(result.events.map((event) => event.name)).toContain(
      'subscription.uncancelled',
    );
  });

  it('preserves history when changing plan type and stays idempotent afterwards', async () => {
    const current = existing();
    stored.push(current);
    state.subscription = {
      ...state.subscription!,
      type: SubscriptionType.SEAT_BASED,
      monthlyCredits: undefined,
      noOfSeats: 25,
    };
    await useCase.execute(state);
    expect(stored).toHaveLength(2);
    expect(stored.filter(isActive)).toHaveLength(1);
    expect(stored.find((entry) => entry.id !== current.id)).toMatchObject({
      type: SubscriptionType.SEAT_BASED,
      noOfSeats: 25,
    });
    expect((await useCase.execute(state)).changed).toBe(false);
  });

  it('applies an immediate plan change even when the previous plan was cancelled for a future date', async () => {
    const current = existing();
    current.cancelledAt = new Date('2026-10-19T00:00:00Z');
    current.accessEndsAt = new Date('2027-10-15T00:00:00Z');
    stored.push(current);
    state.subscription = {
      ...state.subscription!,
      type: SubscriptionType.SEAT_BASED,
      monthlyCredits: undefined,
      noOfSeats: 25,
    };
    await useCase.execute(state);
    const active = stored.filter(isActive);
    expect(active).toHaveLength(1);
    expect(active[0].type).toBe(SubscriptionType.SEAT_BASED);
  });

  it('rejects insufficient purchased seats without changing the serving subscription', async () => {
    stored.push(existing());
    const before = structuredClone(stored);
    state.subscription = {
      ...state.subscription!,
      type: SubscriptionType.SEAT_BASED,
      monthlyCredits: undefined,
      noOfSeats: 4,
    };
    await expect(useCase.execute(state)).rejects.toThrow(/seats/i);
    expect(stored).toEqual(before);
  });

  it('rejects ambiguous serving Core subscriptions without mutating either record', async () => {
    stored.push(existing(), existing());
    const before = structuredClone(stored);
    await expect(useCase.execute(state)).rejects.toThrow(/multiple|overlap/i);
    expect(stored).toEqual(before);
  });

  it('does not revive the old record when a new contract starts after it ended', async () => {
    const current = existing();
    current.cancelledAt = new Date('2026-10-01T00:00:00Z');
    current.accessEndsAt = new Date('2026-10-01T00:00:00Z');
    stored.push(current);
    state.subscription!.startsAt = new Date('2026-10-15T00:00:00Z');
    await useCase.execute(state);
    expect(stored).toHaveLength(2);
    expect(isActive(stored[0])).toBe(false);
    expect(stored.filter(isActive)).toHaveLength(1);
  });
});
