import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { UpdateMonthlyCreditsUseCase } from './update-monthly-credits.use-case';
import { UpdateMonthlyCreditsCommand } from './update-monthly-credits.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { GetActiveSubscriptionUseCase } from '../get-active-subscription/get-active-subscription.use-case';
import {
  InvalidSubscriptionDataError,
  InvalidSubscriptionTypeError,
  SubscriptionNotFoundError,
} from '../../subscription.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';

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

function createUsageBasedSubscription(
  monthlyCredits = 1000,
): UsageBasedSubscription {
  return new UsageBasedSubscription({
    orgId: mockOrgId,
    monthlyCredits,
    startsAt: new Date('2026-07-01T00:00:00.000Z'),
    cancelledAt: null,
    billingInfo: createBillingInfo(),
  });
}

function createSeatBasedSubscription(): SeatBasedSubscription {
  const startsAt = new Date('2026-07-01T00:00:00.000Z');
  return new SeatBasedSubscription({
    orgId: mockOrgId,
    noOfSeats: 10,
    pricePerSeat: 99.99,
    renewalCycle: RenewalCycle.YEARLY,
    renewalCycleAnchor: startsAt,
    startsAt,
    cancelledAt: null,
    billingInfo: createBillingInfo(),
  });
}

function activeResult(subscription: Subscription) {
  return { subscription, availableSeats: null, nextRenewalDate: new Date() };
}

describe('UpdateMonthlyCreditsUseCase', () => {
  let useCase: UpdateMonthlyCreditsUseCase;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;
  let getActiveSubscriptionUseCase: jest.Mocked<GetActiveSubscriptionUseCase>;
  let contextService: jest.Mocked<ContextService>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateMonthlyCreditsUseCase,
        {
          provide: SubscriptionRepository,
          useValue: { update: jest.fn() },
        },
        {
          provide: GetActiveSubscriptionUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: EventEmitter2,
          useValue: { emitAsync: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: ContextService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(UpdateMonthlyCreditsUseCase);
    subscriptionRepository = module.get(SubscriptionRepository);
    getActiveSubscriptionUseCase = module.get(GetActiveSubscriptionUseCase);
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

  it('updates the monthly credits of a usage-based subscription', async () => {
    const subscription = createUsageBasedSubscription(1000);
    getActiveSubscriptionUseCase.execute.mockResolvedValue(
      activeResult(subscription),
    );
    subscriptionRepository.update.mockResolvedValue(subscription);

    await useCase.execute(
      new UpdateMonthlyCreditsCommand({
        orgId: mockOrgId,
        requestingUserId: mockUserId,
        monthlyCredits: 5000,
      }),
    );

    expect(subscription.monthlyCredits).toBe(5000);
    expect(subscriptionRepository.update).toHaveBeenCalledWith(subscription);
  });

  it('allows setting credits to 0', async () => {
    const subscription = createUsageBasedSubscription(1000);
    getActiveSubscriptionUseCase.execute.mockResolvedValue(
      activeResult(subscription),
    );
    subscriptionRepository.update.mockResolvedValue(subscription);

    await useCase.execute(
      new UpdateMonthlyCreditsCommand({
        orgId: mockOrgId,
        requestingUserId: mockUserId,
        monthlyCredits: 0,
      }),
    );

    expect(subscription.monthlyCredits).toBe(0);
    expect(subscriptionRepository.update).toHaveBeenCalled();
  });

  it('throws InvalidSubscriptionDataError for negative credits', async () => {
    await expect(
      useCase.execute(
        new UpdateMonthlyCreditsCommand({
          orgId: mockOrgId,
          requestingUserId: mockUserId,
          monthlyCredits: -1,
        }),
      ),
    ).rejects.toThrow(InvalidSubscriptionDataError);
    expect(subscriptionRepository.update).not.toHaveBeenCalled();
  });

  it('throws SubscriptionNotFoundError when no active subscription exists', async () => {
    getActiveSubscriptionUseCase.execute.mockRejectedValue(
      new SubscriptionNotFoundError(mockOrgId),
    );

    await expect(
      useCase.execute(
        new UpdateMonthlyCreditsCommand({
          orgId: mockOrgId,
          requestingUserId: mockUserId,
          monthlyCredits: 5000,
        }),
      ),
    ).rejects.toThrow(SubscriptionNotFoundError);
    expect(subscriptionRepository.update).not.toHaveBeenCalled();
  });

  it('throws InvalidSubscriptionTypeError for seat-based subscriptions', async () => {
    getActiveSubscriptionUseCase.execute.mockResolvedValue(
      activeResult(createSeatBasedSubscription()),
    );

    await expect(
      useCase.execute(
        new UpdateMonthlyCreditsCommand({
          orgId: mockOrgId,
          requestingUserId: mockUserId,
          monthlyCredits: 5000,
        }),
      ),
    ).rejects.toThrow(InvalidSubscriptionTypeError);
    expect(subscriptionRepository.update).not.toHaveBeenCalled();
  });
});
