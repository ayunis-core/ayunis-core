jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { randomUUID } from 'crypto';
import type { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import type { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import type { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import {
  InvalidSubscriptionDataError,
  UnauthorizedSubscriptionAccessError,
} from 'src/iam/subscriptions/application/subscription.errors';
import { ResolveSubscriptionOverlapCommand } from './resolve-subscription-overlap.command';
import { ResolveSubscriptionOverlapUseCase } from './resolve-subscription-overlap.use-case';

const ORG_ID = randomUUID();
const ACTOR_ID = randomUUID();

function billingInfo(): SubscriptionBillingInfo {
  return new SubscriptionBillingInfo({
    companyName: 'Stadt Euskirchen',
    street: 'Kölner Straße',
    houseNumber: '75',
    postalCode: '53879',
    city: 'Euskirchen',
    country: 'DE',
  });
}

function overlappingSubscriptions() {
  const seat = new SeatBasedSubscription({
    orgId: ORG_ID,
    startsAt: new Date('2025-03-16T00:00:00.000Z'),
    cancelledAt: new Date('2026-07-29T00:00:00.000Z'),
    accessEndsAt: new Date('2027-03-16T00:00:00.000Z'),
    renewalCycleAnchor: new Date('2025-03-16T00:00:00.000Z'),
    renewalCycle: RenewalCycle.YEARLY,
    noOfSeats: 100,
    pricePerSeat: 120,
    billingInfo: billingInfo(),
  });
  const usage = new UsageBasedSubscription({
    orgId: ORG_ID,
    startsAt: new Date('2026-08-01T00:00:00.000Z'),
    monthlyCredits: 100_000,
    billingInfo: billingInfo(),
  });
  return { seat, usage };
}

describe('ResolveSubscriptionOverlapUseCase', () => {
  const repository = {
    findByOrgId: jest.fn(),
    applyAccessEndAdjustments: jest.fn(),
  } as unknown as jest.Mocked<SubscriptionRepository>;
  const lock = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<AcquireSeatAllocationLockUseCase>;
  const context = {
    get: jest.fn(),
  } as unknown as jest.Mocked<ContextService>;
  const useCase = new ResolveSubscriptionOverlapUseCase(
    repository,
    lock,
    context,
  );

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-02T12:00:00.000Z'));
    jest.clearAllMocks();
    context.get.mockImplementation((key) =>
      key === 'systemRole' ? SystemRole.SUPER_ADMIN : undefined,
    );
  });

  afterEach(() => jest.useRealTimers());

  it('ends every conflicting subscription and records the correction atomically', async () => {
    const { seat, usage } = overlappingSubscriptions();
    repository.findByOrgId.mockResolvedValue([seat, usage]);
    const accessEndsAt = new Date('2026-08-01T00:00:00.000Z');

    await useCase.execute(
      new ResolveSubscriptionOverlapCommand({
        orgId: ORG_ID,
        requestingUserId: ACTOR_ID,
        authoritativeSubscriptionId: usage.id,
        adjustments: [{ subscriptionId: seat.id, accessEndsAt }],
        reason: 'AYC-1158: usage contract replaced seat contract',
      }),
    );

    expect(lock.execute).toHaveBeenCalledWith(ORG_ID);
    expect(repository.applyAccessEndAdjustments).toHaveBeenCalledWith({
      orgId: ORG_ID,
      requestingUserId: ACTOR_ID,
      reason: 'AYC-1158: usage contract replaced seat contract',
      adjustments: [
        {
          subscription: seat,
          previousAccessEndsAt: new Date('2027-03-16T00:00:00.000Z'),
        },
      ],
    });
    expect(seat.accessEndsAt).toEqual(accessEndsAt);
    expect(seat.cancelledAt).toEqual(new Date('2026-07-29T00:00:00.000Z'));
    expect(usage.accessEndsAt).toBeNull();
  });

  it('stamps cancellation on an ended subscription that was never cancelled', async () => {
    const { seat, usage } = overlappingSubscriptions();
    repository.findByOrgId.mockResolvedValue([seat, usage]);

    await useCase.execute(
      new ResolveSubscriptionOverlapCommand({
        orgId: ORG_ID,
        requestingUserId: ACTOR_ID,
        authoritativeSubscriptionId: seat.id,
        adjustments: [
          { subscriptionId: usage.id, accessEndsAt: usage.startsAt },
        ],
        reason: 'Usage contract was recorded by mistake',
      }),
    );

    expect(usage.accessEndsAt).toEqual(usage.startsAt);
    expect(usage.cancelledAt).toEqual(new Date('2026-10-02T12:00:00.000Z'));
    expect(seat.cancelledAt).toEqual(new Date('2026-07-29T00:00:00.000Z'));
  });

  it('rejects an omitted conflicting subscription without writing', async () => {
    const { seat, usage } = overlappingSubscriptions();
    const third = new UsageBasedSubscription({
      orgId: ORG_ID,
      startsAt: new Date('2026-09-01T00:00:00.000Z'),
      monthlyCredits: 50_000,
      billingInfo: billingInfo(),
    });
    repository.findByOrgId.mockResolvedValue([seat, usage, third]);

    await expect(
      useCase.execute(
        new ResolveSubscriptionOverlapCommand({
          orgId: ORG_ID,
          requestingUserId: ACTOR_ID,
          authoritativeSubscriptionId: usage.id,
          adjustments: [
            {
              subscriptionId: seat.id,
              accessEndsAt: new Date('2026-08-01T00:00:00.000Z'),
            },
          ],
          reason: 'Correct one historical contract',
        }),
      ),
    ).rejects.toThrow(InvalidSubscriptionDataError);
    expect(repository.applyAccessEndAdjustments).not.toHaveBeenCalled();
  });

  it('rejects an end date that leaves a conflicting subscription serving', async () => {
    const { seat, usage } = overlappingSubscriptions();
    repository.findByOrgId.mockResolvedValue([seat, usage]);

    await expect(
      useCase.execute(
        new ResolveSubscriptionOverlapCommand({
          orgId: ORG_ID,
          requestingUserId: ACTOR_ID,
          authoritativeSubscriptionId: usage.id,
          adjustments: [
            {
              subscriptionId: seat.id,
              accessEndsAt: new Date('2026-12-01T00:00:00.000Z'),
            },
          ],
          reason: 'Invalid future correction',
        }),
      ),
    ).rejects.toThrow(InvalidSubscriptionDataError);
    expect(repository.applyAccessEndAdjustments).not.toHaveBeenCalled();
  });

  it('rejects a non-super-admin before acquiring the lock', async () => {
    context.get.mockReturnValue(SystemRole.CUSTOMER);

    await expect(
      useCase.execute(
        new ResolveSubscriptionOverlapCommand({
          orgId: ORG_ID,
          requestingUserId: ACTOR_ID,
          authoritativeSubscriptionId: randomUUID(),
          adjustments: [],
          reason: 'Unauthorized correction',
        }),
      ),
    ).rejects.toThrow(UnauthorizedSubscriptionAccessError);
    expect(lock.execute).not.toHaveBeenCalled();
  });
});
