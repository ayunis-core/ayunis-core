jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { AssertSeatAvailableUseCase } from 'src/iam/subscriptions/application/use-cases/assert-seat-available/assert-seat-available.use-case';
import { AssertSeatAvailableCommand } from 'src/iam/subscriptions/application/use-cases/assert-seat-available/assert-seat-available.command';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import type { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import type { CountUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/count-users-by-org-id/count-users-by-org-id.use-case';
import type { CountPendingInvitesByOrgIdUseCase } from 'src/iam/invites/application/use-cases/count-pending-invites-by-org-id/count-pending-invites-by-org-id.use-case';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';

const ORG_ID = 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4' as UUID;

describe(AssertSeatAvailableUseCase.name, () => {
  const subscriptions = {
    findByOrgId: jest.fn(),
  } as unknown as jest.Mocked<SubscriptionRepository>;
  const allocationLock = { acquire: jest.fn() };
  const countUsers = { execute: jest.fn() };
  const countInvites = { execute: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    subscriptions.findByOrgId.mockResolvedValue([seatSubscription(5)]);
    countUsers.execute.mockResolvedValue(2);
    countInvites.execute.mockResolvedValue(1);
  });

  it('admits when a seat-based subscription has remaining capacity', async () => {
    const useCase = createUseCase(true);

    await expect(
      useCase.execute(new AssertSeatAvailableCommand(ORG_ID)),
    ).resolves.toBeUndefined();
    expect(allocationLock.acquire).toHaveBeenCalledWith(ORG_ID);
    expect(allocationLock.acquire.mock.invocationCallOrder[0]).toBeLessThan(
      subscriptions.findByOrgId.mock.invocationCallOrder[0],
    );
  });

  it('runs seat counts sequentially on the transactional connection', async () => {
    let resolveUsers!: (value: number) => void;
    countUsers.execute.mockReturnValue(
      new Promise((resolve) => {
        resolveUsers = resolve;
      }),
    );
    const useCase = createUseCase(true);

    const admission = useCase.execute(new AssertSeatAvailableCommand(ORG_ID));
    await new Promise((resolve) => setImmediate(resolve));

    expect(countUsers.execute).toHaveBeenCalledTimes(1);
    expect(countInvites.execute).not.toHaveBeenCalled();

    resolveUsers(2);
    await expect(admission).resolves.toBeUndefined();
    expect(countInvites.execute).toHaveBeenCalledTimes(1);
  });

  it('rejects without increasing an exhausted seat-based subscription', async () => {
    subscriptions.findByOrgId.mockResolvedValue([seatSubscription(3)]);
    const useCase = createUseCase(true);

    await expect(
      useCase.execute(new AssertSeatAvailableCommand(ORG_ID)),
    ).rejects.toMatchObject({
      code: 'INSUFFICIENT_SEATS',
      metadata: { requiredSeats: 1, availableSeats: 0 },
    });
  });

  it('does not apply paid-seat admission outside cloud hosting', async () => {
    const useCase = createUseCase(false);

    await expect(
      useCase.execute(new AssertSeatAvailableCommand(ORG_ID)),
    ).resolves.toBeUndefined();
    expect(allocationLock.acquire).not.toHaveBeenCalled();
  });

  it('admits usage-based organizations without counting seats', async () => {
    subscriptions.findByOrgId.mockResolvedValue([
      new UsageBasedSubscription({
        orgId: ORG_ID,
        billingInfo: billingInfo(),
        monthlyCredits: 10_000,
      }),
    ]);
    const useCase = createUseCase(true);

    await expect(
      useCase.execute(new AssertSeatAvailableCommand(ORG_ID)),
    ).resolves.toBeUndefined();
    expect(countUsers.execute).not.toHaveBeenCalled();
    expect(countInvites.execute).not.toHaveBeenCalled();
  });

  it('admits an organization without an active subscription', async () => {
    subscriptions.findByOrgId.mockResolvedValue([]);
    const useCase = createUseCase(true);

    await expect(
      useCase.execute(new AssertSeatAvailableCommand(ORG_ID)),
    ).resolves.toBeUndefined();
  });

  it('rejects ambiguous active subscription state', async () => {
    subscriptions.findByOrgId.mockResolvedValue([
      seatSubscription(5),
      seatSubscription(5),
    ]);
    const useCase = createUseCase(true);

    await expect(
      useCase.execute(new AssertSeatAvailableCommand(ORG_ID)),
    ).rejects.toMatchObject({ code: 'MULTIPLE_ACTIVE_SUBSCRIPTIONS' });
  });

  function createUseCase(isCloudHosted: boolean): AssertSeatAvailableUseCase {
    return new AssertSeatAvailableUseCase(
      subscriptions,
      new AcquireSeatAllocationLockUseCase(allocationLock),
      countUsers as unknown as CountUsersByOrgIdUseCase,
      countInvites as unknown as CountPendingInvitesByOrgIdUseCase,
      {
        get: jest.fn().mockReturnValue(isCloudHosted),
      } as unknown as ConfigService,
    );
  }
});

function seatSubscription(noOfSeats: number): SeatBasedSubscription {
  return new SeatBasedSubscription({
    orgId: ORG_ID,
    billingInfo: billingInfo(),
    noOfSeats,
    pricePerSeat: 9.99,
    renewalCycle: RenewalCycle.MONTHLY,
    renewalCycleAnchor: new Date('2026-08-01T00:00:00.000Z'),
  });
}

function billingInfo(): SubscriptionBillingInfo {
  return new SubscriptionBillingInfo({
    companyName: 'Demo Municipality',
    street: 'Market Square',
    houseNumber: '1',
    postalCode: '10115',
    city: 'Berlin',
    country: 'DE',
  });
}
