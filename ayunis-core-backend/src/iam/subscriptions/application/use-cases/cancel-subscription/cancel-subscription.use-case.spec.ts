jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionCancelledEvent } from 'src/iam/subscriptions/application/events/subscription-cancelled.event';
import { randomUUID } from 'crypto';
import { CancelSubscriptionUseCase } from './cancel-subscription.use-case';
import { CancelSubscriptionCommand } from './cancel-subscription.command';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import {
  MultipleActiveSubscriptionsError,
  SubscriptionAlreadyCancelledError,
  SubscriptionNotFoundError,
  UnauthorizedSubscriptionAccessError,
} from 'src/iam/subscriptions/application/subscription.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';

const mockOrgId = randomUUID();
const mockUserId = randomUUID();

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

function createUsageBased(
  overrides: Partial<{
    createdAt: Date;
    startsAt: Date;
    cancelledAt: Date | null;
  }> = {},
): UsageBasedSubscription {
  return new UsageBasedSubscription({
    orgId: mockOrgId,
    monthlyCredits: 1000,
    createdAt: overrides.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
    startsAt: overrides.startsAt ?? new Date('2026-01-01T00:00:00.000Z'),
    cancelledAt: overrides.cancelledAt ?? null,
    billingInfo: createBillingInfo(),
  });
}

function createSeatBased(): SeatBasedSubscription {
  return new SeatBasedSubscription({
    orgId: mockOrgId,
    noOfSeats: 25,
    pricePerSeat: 120,
    renewalCycle: RenewalCycle.YEARLY,
    renewalCycleAnchor: new Date('2026-01-01T00:00:00.000Z'),
    startsAt: new Date('2026-01-01T00:00:00.000Z'),
    billingInfo: createBillingInfo(),
  });
}

describe('CancelSubscriptionUseCase', () => {
  let useCase: CancelSubscriptionUseCase;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;
  let contextService: jest.Mocked<ContextService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let acquireAllocationLock: jest.Mocked<AcquireSeatAllocationLockUseCase>;

  const command = new CancelSubscriptionCommand({
    orgId: mockOrgId,
    requestingUserId: mockUserId,
  });

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancelSubscriptionUseCase,
        {
          provide: SubscriptionRepository,
          useValue: { findByOrgId: jest.fn(), update: jest.fn() },
        },
        {
          provide: EventEmitter2,
          useValue: { emitAsync: jest.fn().mockResolvedValue([]) },
        },
        { provide: ContextService, useValue: { get: jest.fn() } },
        {
          provide: AcquireSeatAllocationLockUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(CancelSubscriptionUseCase);
    subscriptionRepository = module.get(SubscriptionRepository);
    contextService = module.get(ContextService);
    eventEmitter = module.get(EventEmitter2);
    acquireAllocationLock = module.get(AcquireSeatAllocationLockUseCase);

    contextService.get.mockImplementation((key) => {
      if (key === 'userId') return mockUserId;
      if (key === 'systemRole') return SystemRole.SUPER_ADMIN;
      if (key === 'role') return UserRole.ADMIN;
      if (key === 'orgId') return mockOrgId;
      return undefined;
    });
    (subscriptionRepository.update as jest.Mock).mockImplementation(
      (subscription) => Promise.resolve(subscription),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('locks the organization before reading and cancelling', async () => {
    subscriptionRepository.findByOrgId.mockResolvedValue([createUsageBased()]);

    await useCase.execute(command);

    expect(acquireAllocationLock.execute).toHaveBeenCalledWith(mockOrgId);
    expect(
      acquireAllocationLock.execute.mock.invocationCallOrder[0],
    ).toBeLessThan(
      subscriptionRepository.findByOrgId.mock.invocationCallOrder[0],
    );
  });

  it('cancels a subscription that has not started yet', async () => {
    const scheduled = createUsageBased({
      startsAt: new Date('2026-12-01T00:00:00.000Z'),
    });
    subscriptionRepository.findByOrgId.mockResolvedValue([scheduled]);

    await useCase.execute(command);

    expect(subscriptionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: scheduled.id,
        cancelledAt: new Date('2026-06-15T12:00:00.000Z'),
        accessEndsAt: new Date('2026-12-01T00:00:00.000Z'),
      }),
    );
  });

  it('ends usage-based access when cancellation is requested', async () => {
    const subscription = createUsageBased();
    subscriptionRepository.findByOrgId.mockResolvedValue([subscription]);

    await useCase.execute(command);

    expect(subscriptionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: subscription.id,
        accessEndsAt: new Date('2026-06-15T12:00:00.000Z'),
      }),
    );
  });

  it('refuses to mutate a subscription whose access already ended', async () => {
    const subscription = createSeatBased();
    subscription.accessEndsAt = new Date('2026-05-01T00:00:00.000Z');
    subscriptionRepository.findByOrgId.mockResolvedValue([subscription]);

    await expect(useCase.execute(command)).rejects.toThrow(
      SubscriptionNotFoundError,
    );
    expect(subscriptionRepository.update).not.toHaveBeenCalled();
  });

  it('ends seat-based access at the paid billing-period boundary', async () => {
    const subscription = createSeatBased();
    subscriptionRepository.findByOrgId.mockResolvedValue([subscription]);

    await useCase.execute(command);

    expect(subscriptionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: subscription.id,
        accessEndsAt: new Date('2027-01-01T00:00:00.000Z'),
      }),
    );
  });

  it('does not announce a cancellation for a subscription that never served', async () => {
    subscriptionRepository.findByOrgId.mockResolvedValue([
      createUsageBased({ startsAt: new Date('2026-12-01T00:00:00.000Z') }),
    ]);

    await useCase.execute(command);

    // Listeners tear down org-wide entitlements such as credit limits; a
    // scheduled subscription ending changes nothing for anyone.
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('announces a cancellation for a subscription that was serving', async () => {
    subscriptionRepository.findByOrgId.mockResolvedValue([createUsageBased()]);

    await useCase.execute(command);

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      SubscriptionCancelledEvent.EVENT_NAME,
      expect.any(SubscriptionCancelledEvent),
    );
  });

  it('cancels the newest subscription rather than an older serving one', async () => {
    const older = createUsageBased({
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    });
    const newest = createUsageBased({
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      startsAt: new Date('2026-12-01T00:00:00.000Z'),
    });
    subscriptionRepository.findByOrgId.mockResolvedValue([older, newest]);

    await useCase.execute(command);

    expect(subscriptionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: newest.id }),
    );
  });

  it('cancels the serving subscription when a newer record has ended', async () => {
    const serving = createUsageBased({
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    });
    const ended = createUsageBased({
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
    });
    ended.accessEndsAt = new Date('2026-06-01T00:00:00.000Z');
    subscriptionRepository.findByOrgId.mockResolvedValue([serving, ended]);

    await useCase.execute(command);

    expect(subscriptionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: serving.id }),
    );
  });

  it('still refuses when more than one subscription is currently serving', async () => {
    subscriptionRepository.findByOrgId.mockResolvedValue([
      createUsageBased({ createdAt: new Date('2025-01-01T00:00:00.000Z') }),
      createUsageBased({ createdAt: new Date('2026-05-01T00:00:00.000Z') }),
    ]);

    await expect(useCase.execute(command)).rejects.toThrow(
      MultipleActiveSubscriptionsError,
    );
    expect(subscriptionRepository.update).not.toHaveBeenCalled();
  });

  it('throws SubscriptionNotFoundError when the org has no subscription', async () => {
    subscriptionRepository.findByOrgId.mockResolvedValue([]);

    await expect(useCase.execute(command)).rejects.toThrow(
      SubscriptionNotFoundError,
    );
  });

  it('throws SubscriptionAlreadyCancelledError when already cancelled', async () => {
    subscriptionRepository.findByOrgId.mockResolvedValue([
      createUsageBased({
        startsAt: new Date('2026-12-01T00:00:00.000Z'),
        cancelledAt: new Date('2026-06-01T00:00:00.000Z'),
      }),
    ]);

    await expect(useCase.execute(command)).rejects.toThrow(
      SubscriptionAlreadyCancelledError,
    );
  });

  it('rejects an admin of a different organization', async () => {
    contextService.get.mockImplementation((key) => {
      if (key === 'userId') return mockUserId;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      if (key === 'role') return UserRole.ADMIN;
      if (key === 'orgId') return randomUUID();
      return undefined;
    });
    subscriptionRepository.findByOrgId.mockResolvedValue([createUsageBased()]);

    await expect(useCase.execute(command)).rejects.toThrow(
      UnauthorizedSubscriptionAccessError,
    );
    expect(subscriptionRepository.findByOrgId).not.toHaveBeenCalled();
    expect(subscriptionRepository.update).not.toHaveBeenCalled();
  });
});
