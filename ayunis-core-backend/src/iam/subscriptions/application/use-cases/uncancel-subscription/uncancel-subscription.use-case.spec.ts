jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { UncancelSubscriptionUseCase } from './uncancel-subscription.use-case';
import { UncancelSubscriptionCommand } from './uncancel-subscription.command';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import {
  SubscriptionNotFoundError,
  SubscriptionNotCancelledError,
  SubscriptionExpiredError,
  SubscriptionAccessOverlapError,
} from 'src/iam/subscriptions/application/subscription.errors';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SubscriptionUncancelledEvent } from 'src/iam/subscriptions/application/events/subscription-uncancelled.event';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
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

function createSeatBased(
  overrides: Partial<{
    cancelledAt: Date | null;
    renewalCycleAnchor: Date;
    startsAt: Date;
    createdAt: Date;
  }> = {},
): SeatBasedSubscription {
  const anchor = overrides.renewalCycleAnchor ?? new Date('2025-01-01');
  return new SeatBasedSubscription({
    orgId: mockOrgId,
    createdAt: overrides.createdAt,
    noOfSeats: 10,
    pricePerSeat: 9.99,
    renewalCycle: RenewalCycle.MONTHLY,
    renewalCycleAnchor: anchor,
    startsAt: overrides.startsAt ?? anchor,
    cancelledAt: overrides.cancelledAt ?? null,
    billingInfo: createBillingInfo(),
  });
}

function createUsageBased(
  overrides: Partial<{
    cancelledAt: Date | null;
    startsAt: Date;
    createdAt: Date;
  }> = {},
): UsageBasedSubscription {
  return new UsageBasedSubscription({
    orgId: mockOrgId,
    createdAt: overrides.createdAt,
    monthlyCredits: 1000,
    startsAt: overrides.startsAt ?? new Date('2025-01-01'),
    cancelledAt: overrides.cancelledAt ?? null,
    billingInfo: createBillingInfo(),
  });
}

describe('UncancelSubscriptionUseCase', () => {
  let useCase: UncancelSubscriptionUseCase;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;
  let contextService: jest.Mocked<ContextService>;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emitAsync'>>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UncancelSubscriptionUseCase,
        {
          provide: SubscriptionRepository,
          useValue: {
            findByOrgId: jest.fn().mockResolvedValue([]),
            update: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: { emitAsync: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: ContextService,
          useValue: { get: jest.fn() },
        },
        {
          provide: AcquireSeatAllocationLockUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(UncancelSubscriptionUseCase);
    subscriptionRepository = module.get(SubscriptionRepository);
    contextService = module.get(ContextService);
    eventEmitter = module.get(EventEmitter2);
  });

  beforeEach(() => {
    // Pin the clock to a fixed mid-month instant so the relative dates used
    // in the billing-period tests below stay consistent regardless of the
    // calendar day the suite runs on.
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));

    subscriptionRepository.findByOrgId.mockResolvedValue([]);
    contextService.get.mockImplementation((key) => {
      if (key === 'userId') return mockUserId;
      if (key === 'systemRole') return SystemRole.SUPER_ADMIN;
      if (key === 'role') return UserRole.ADMIN;
      if (key === 'orgId') return mockOrgId;
      return undefined;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  const command = new UncancelSubscriptionCommand({
    orgId: mockOrgId,
    requestingUserId: mockUserId,
  });

  it('should throw SubscriptionNotFoundError when no subscription exists', async () => {
    subscriptionRepository.findByOrgId.mockResolvedValue([]);

    await expect(useCase.execute(command)).rejects.toThrow(
      SubscriptionNotFoundError,
    );
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('should throw SubscriptionNotCancelledError when subscription is not cancelled', async () => {
    subscriptionRepository.findByOrgId.mockResolvedValue([
      createSeatBased({ cancelledAt: null }),
    ]);

    await expect(useCase.execute(command)).rejects.toThrow(
      SubscriptionNotCancelledError,
    );
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('should uncancel a seat-based subscription still within its billing period', async () => {
    const now = new Date();
    const anchor = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const cancelledAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const subscription = createSeatBased({
      cancelledAt,
      renewalCycleAnchor: anchor,
    });
    subscriptionRepository.findByOrgId.mockResolvedValue([subscription]);
    subscriptionRepository.update.mockResolvedValue(subscription);

    await useCase.execute(command);

    expect(subscription.cancelledAt).toBeNull();
    expect(subscriptionRepository.update).toHaveBeenCalledWith(subscription);
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      SubscriptionUncancelledEvent.EVENT_NAME,
      expect.objectContaining({
        orgId: mockOrgId,
        payload: expect.objectContaining({
          orgId: mockOrgId,
          type: SubscriptionType.SEAT_BASED,
          noOfSeats: 10,
        }),
      }),
    );
  });

  it('rejects uncancelling when it would overlap another access period', async () => {
    const existing = createSeatBased({
      startsAt: new Date('2025-01-01T00:00:00.000Z'),
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    });
    const subscription = createUsageBased({
      startsAt: new Date('2099-01-01T00:00:00.000Z'),
      cancelledAt: new Date('2025-06-10T00:00:00.000Z'),
      createdAt: new Date('2025-06-01T00:00:00.000Z'),
    });
    subscriptionRepository.findByOrgId.mockResolvedValue([
      existing,
      subscription,
    ]);

    await expect(useCase.execute(command)).rejects.toThrow(
      SubscriptionAccessOverlapError,
    );

    expect(subscriptionRepository.update).not.toHaveBeenCalled();
  });

  // Overlap recovery ends the newer record without touching the older one, so
  // the cancelled subscription that still serves must stay reachable.
  it('reactivates the serving cancelled subscription when a newer record has ended', async () => {
    const now = new Date();
    const anchor = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const serving = createSeatBased({
      cancelledAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      renewalCycleAnchor: anchor,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    });
    const ended = createUsageBased({
      startsAt: new Date('2025-05-01T00:00:00.000Z'),
      createdAt: new Date('2025-05-01T00:00:00.000Z'),
    });
    ended.accessEndsAt = new Date('2025-06-01T00:00:00.000Z');
    subscriptionRepository.findByOrgId.mockResolvedValue([serving, ended]);
    subscriptionRepository.update.mockResolvedValue(serving);

    await useCase.execute(command);

    expect(serving.cancelledAt).toBeNull();
    expect(subscriptionRepository.update).toHaveBeenCalledWith(serving);
    expect(ended.accessEndsAt).toEqual(new Date('2025-06-01T00:00:00.000Z'));
  });

  it('should reject uncancelling a seat-based subscription past its billing period', async () => {
    const subscription = createSeatBased({
      cancelledAt: new Date('2024-01-15'),
      renewalCycleAnchor: new Date('2024-01-01'),
    });
    subscriptionRepository.findByOrgId.mockResolvedValue([subscription]);

    await expect(useCase.execute(command)).rejects.toThrow(
      SubscriptionExpiredError,
    );
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('should uncancel a usage-based subscription cancelled in the current month', async () => {
    const now = new Date();
    const cancelledAt = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const subscription = createUsageBased({ cancelledAt });
    subscriptionRepository.findByOrgId.mockResolvedValue([subscription]);
    subscriptionRepository.update.mockResolvedValue(subscription);

    await useCase.execute(command);

    expect(subscription.cancelledAt).toBeNull();
    expect(subscriptionRepository.update).toHaveBeenCalledWith(subscription);
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      SubscriptionUncancelledEvent.EVENT_NAME,
      expect.objectContaining({
        orgId: mockOrgId,
        payload: expect.objectContaining({
          orgId: mockOrgId,
          type: SubscriptionType.USAGE_BASED,
          monthlyCredits: 1000,
        }),
      }),
    );
  });

  it('should reject uncancelling a usage-based subscription cancelled in a previous month', async () => {
    const now = new Date();
    const previousMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15),
    );
    const subscription = createUsageBased({ cancelledAt: previousMonth });
    subscriptionRepository.findByOrgId.mockResolvedValue([subscription]);

    await expect(useCase.execute(command)).rejects.toThrow(
      SubscriptionExpiredError,
    );
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });
  // Cancelling a not-yet-started subscription only became reachable with
  // AYC-995; canUncancel asked isActive(), which is false for a scheduled
  // subscription, so restoring one was rejected as expired.
  it('uncancels a seat-based subscription that was cancelled before it started', async () => {
    const startsAt = new Date('2099-01-01T00:00:00.000Z');
    const subscription = createSeatBased({
      startsAt,
      renewalCycleAnchor: startsAt,
      cancelledAt: new Date(),
    });
    subscriptionRepository.findByOrgId.mockResolvedValue([subscription]);

    await useCase.execute(
      new UncancelSubscriptionCommand({
        orgId: mockOrgId,
        requestingUserId: mockUserId,
      }),
    );

    expect(subscription.cancelledAt).toBeNull();
    expect(subscriptionRepository.update).toHaveBeenCalledWith(subscription);
  });

  it('uncancels a usage-based subscription cancelled before it started, in a later month', async () => {
    const subscription = createUsageBased({
      startsAt: new Date('2099-01-01T00:00:00.000Z'),
      cancelledAt: new Date('2026-01-15T00:00:00.000Z'),
    });
    subscriptionRepository.findByOrgId.mockResolvedValue([subscription]);

    await useCase.execute(
      new UncancelSubscriptionCommand({
        orgId: mockOrgId,
        requestingUserId: mockUserId,
      }),
    );

    expect(subscription.cancelledAt).toBeNull();
  });
});
