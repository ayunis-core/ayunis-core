import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UpdateStartDateUseCase } from './update-start-date.use-case';
import { UpdateStartDateCommand } from './update-start-date.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import {
  InvalidSubscriptionDataError,
  SubscriptionAlreadyCancelledError,
  SubscriptionNotFoundError,
} from '../../subscription.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';

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

function createSeatBasedSubscription(
  overrides: Partial<{
    startsAt: Date;
    cancelledAt: Date | null;
    renewalCycleAnchor: Date;
  }> = {},
): SeatBasedSubscription {
  const startsAt = overrides.startsAt ?? new Date('2026-07-01T00:00:00.000Z');

  return new SeatBasedSubscription({
    orgId: mockOrgId,
    noOfSeats: 10,
    pricePerSeat: 99.99,
    renewalCycle: RenewalCycle.YEARLY,
    renewalCycleAnchor: overrides.renewalCycleAnchor ?? startsAt,
    startsAt,
    cancelledAt: overrides.cancelledAt ?? null,
    billingInfo: createBillingInfo(),
  });
}

function createUsageBasedSubscription(
  overrides: Partial<{ startsAt: Date; cancelledAt: Date | null }> = {},
): UsageBasedSubscription {
  return new UsageBasedSubscription({
    orgId: mockOrgId,
    monthlyCredits: 1000,
    startsAt: overrides.startsAt ?? new Date('2026-07-01T00:00:00.000Z'),
    cancelledAt: overrides.cancelledAt ?? null,
    billingInfo: createBillingInfo(),
  });
}

describe('UpdateStartDateUseCase', () => {
  let useCase: UpdateStartDateUseCase;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;
  let contextService: jest.Mocked<ContextService>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateStartDateUseCase,
        {
          provide: SubscriptionRepository,
          useValue: {
            findLatestByOrgId: jest.fn(),
            updateStartDate: jest.fn(),
          },
        },
        {
          provide: ContextService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(UpdateStartDateUseCase);
    subscriptionRepository = module.get(SubscriptionRepository);
    contextService = module.get(ContextService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  beforeEach(() => {
    contextService.get.mockImplementation((key) => {
      if (key === 'systemRole') return SystemRole.SUPER_ADMIN;
      if (key === 'role') return UserRole.ADMIN;
      if (key === 'orgId') return mockOrgId;
      return undefined;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should update the start date of a usage-based subscription', async () => {
    const subscription = createUsageBasedSubscription();
    const newStartsAt = new Date('2026-08-15T00:00:00.000Z');
    const updatedSubscription = createUsageBasedSubscription({
      startsAt: newStartsAt,
    });

    subscriptionRepository.findLatestByOrgId.mockResolvedValue(subscription);
    subscriptionRepository.updateStartDate.mockResolvedValue(
      updatedSubscription,
    );

    const result = await useCase.execute(
      new UpdateStartDateCommand({
        orgId: mockOrgId,
        requestingUserId: mockUserId,
        startsAt: newStartsAt,
      }),
    );

    expect(subscriptionRepository.updateStartDate).toHaveBeenCalledWith({
      subscriptionId: subscription.id,
      startsAt: newStartsAt,
    });
    expect(result.startsAt).toEqual(newStartsAt);
  });

  it('should update the start date and renewal cycle anchor of a seat-based subscription', async () => {
    const subscription = createSeatBasedSubscription();
    const newStartsAt = new Date('2026-09-01T00:00:00.000Z');
    const updatedSubscription = createSeatBasedSubscription({
      startsAt: newStartsAt,
      renewalCycleAnchor: newStartsAt,
    });

    subscriptionRepository.findLatestByOrgId.mockResolvedValue(subscription);
    subscriptionRepository.updateStartDate.mockResolvedValue(
      updatedSubscription,
    );

    const result = await useCase.execute(
      new UpdateStartDateCommand({
        orgId: mockOrgId,
        requestingUserId: mockUserId,
        startsAt: newStartsAt,
      }),
    );

    expect(subscriptionRepository.updateStartDate).toHaveBeenCalledWith({
      subscriptionId: subscription.id,
      startsAt: newStartsAt,
      renewalCycleAnchor: newStartsAt,
    });
    expect(result).toBeInstanceOf(SeatBasedSubscription);
    expect((result as SeatBasedSubscription).renewalCycleAnchor).toEqual(
      newStartsAt,
    );
  });

  it('should throw SubscriptionNotFoundError when no subscription exists', async () => {
    subscriptionRepository.findLatestByOrgId.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new UpdateStartDateCommand({
          orgId: mockOrgId,
          requestingUserId: mockUserId,
          startsAt: new Date('2026-08-15T00:00:00.000Z'),
        }),
      ),
    ).rejects.toThrow(SubscriptionNotFoundError);
  });

  it('should throw SubscriptionAlreadyCancelledError when the latest subscription is cancelled', async () => {
    const cancelledSubscription = createSeatBasedSubscription({
      cancelledAt: new Date('2026-07-15T00:00:00.000Z'),
    });
    subscriptionRepository.findLatestByOrgId.mockResolvedValue(
      cancelledSubscription,
    );

    await expect(
      useCase.execute(
        new UpdateStartDateCommand({
          orgId: mockOrgId,
          requestingUserId: mockUserId,
          startsAt: new Date('2026-08-15T00:00:00.000Z'),
        }),
      ),
    ).rejects.toThrow(SubscriptionAlreadyCancelledError);
  });

  it('should throw InvalidSubscriptionDataError when moving an active subscription start date to the future', async () => {
    const activeSubscription = createSeatBasedSubscription({
      startsAt: new Date('2020-01-01T00:00:00.000Z'),
      renewalCycleAnchor: new Date('2020-01-01T00:00:00.000Z'),
    });
    subscriptionRepository.findLatestByOrgId.mockResolvedValue(
      activeSubscription,
    );

    const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    await expect(
      useCase.execute(
        new UpdateStartDateCommand({
          orgId: mockOrgId,
          requestingUserId: mockUserId,
          startsAt: futureDate,
        }),
      ),
    ).rejects.toThrow(InvalidSubscriptionDataError);
  });

  it('should wrap unexpected repository errors', async () => {
    const subscription = createUsageBasedSubscription();
    subscriptionRepository.findLatestByOrgId.mockResolvedValue(subscription);
    subscriptionRepository.updateStartDate.mockRejectedValue(
      new Error('database unavailable'),
    );

    await expect(
      useCase.execute(
        new UpdateStartDateCommand({
          orgId: mockOrgId,
          requestingUserId: mockUserId,
          startsAt: new Date('2026-08-15T00:00:00.000Z'),
        }),
      ),
    ).rejects.toThrow('Unexpected error');
  });
});
