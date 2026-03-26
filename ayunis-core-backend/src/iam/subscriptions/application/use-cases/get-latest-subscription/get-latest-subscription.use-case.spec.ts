import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { GetLatestSubscriptionUseCase } from './get-latest-subscription.use-case';
import { GetLatestSubscriptionQuery } from './get-latest-subscription.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { SubscriptionNotFoundError } from '../../subscription.errors';

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
  orgId: UUID,
  overrides: Partial<{
    cancelledAt: Date | null;
    renewalCycleAnchor: Date;
    startsAt: Date;
    noOfSeats: number;
  }> = {},
): SeatBasedSubscription {
  const anchor = overrides.renewalCycleAnchor ?? new Date('2025-01-01');
  return new SeatBasedSubscription({
    orgId,
    noOfSeats: overrides.noOfSeats ?? 10,
    pricePerSeat: 9.99,
    renewalCycle: RenewalCycle.MONTHLY,
    renewalCycleAnchor: anchor,
    cancelledAt: overrides.cancelledAt ?? null,
    startsAt: overrides.startsAt ?? anchor,
    billingInfo: createBillingInfo(),
  });
}

function createUsageBasedSubscription(
  orgId: UUID,
  overrides: Partial<{
    cancelledAt: Date | null;
    startsAt: Date;
    monthlyCredits: number;
  }> = {},
): UsageBasedSubscription {
  return new UsageBasedSubscription({
    orgId,
    monthlyCredits: overrides.monthlyCredits ?? 500,
    cancelledAt: overrides.cancelledAt ?? null,
    startsAt: overrides.startsAt ?? new Date('2025-01-01'),
    billingInfo: createBillingInfo(),
  });
}

describe('GetLatestSubscriptionUseCase', () => {
  let useCase: GetLatestSubscriptionUseCase;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;
  let getInvitesByOrgUseCase: jest.Mocked<GetInvitesByOrgUseCase>;
  let findUsersByOrgIdUseCase: jest.Mocked<FindUsersByOrgIdUseCase>;

  const orgId = randomUUID();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLatestSubscriptionUseCase,
        {
          provide: SubscriptionRepository,
          useValue: { findLatestByOrgId: jest.fn() },
        },
        {
          provide: GetInvitesByOrgUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: FindUsersByOrgIdUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetLatestSubscriptionUseCase);
    subscriptionRepository = module.get(SubscriptionRepository);
    getInvitesByOrgUseCase = module.get(GetInvitesByOrgUseCase);
    findUsersByOrgIdUseCase = module.get(FindUsersByOrgIdUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function mockInvitesAndUsers(openInvites: number, userCount: number): void {
    getInvitesByOrgUseCase.execute.mockResolvedValue(
      new Paginated({
        data: [],
        limit: 1000,
        offset: 0,
        total: openInvites,
      }),
    );
    findUsersByOrgIdUseCase.execute.mockResolvedValue(
      new Paginated({
        data: [],
        limit: 1000,
        offset: 0,
        total: userCount,
      }),
    );
  }

  it('should throw SubscriptionNotFoundError when no subscription exists', async () => {
    subscriptionRepository.findLatestByOrgId.mockResolvedValue(null);

    const query = new GetLatestSubscriptionQuery({ orgId });

    await expect(useCase.execute(query)).rejects.toThrow(
      SubscriptionNotFoundError,
    );
  });

  it('should return a scheduled seat-based subscription that has not started yet', async () => {
    const futureStart = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const subscription = createSeatBasedSubscription(orgId, {
      startsAt: futureStart,
      renewalCycleAnchor: futureStart,
      noOfSeats: 10,
    });
    subscriptionRepository.findLatestByOrgId.mockResolvedValue(subscription);
    mockInvitesAndUsers(2, 5);

    const query = new GetLatestSubscriptionQuery({ orgId });
    const result = await useCase.execute(query);

    expect(result.subscription).toBe(subscription);
    expect(result.availableSeats).toBe(3); // 10 - 2 - 5
    expect(result.nextRenewalDate).toEqual(futureStart);
  });

  it('should return an active seat-based subscription with computed available seats', async () => {
    const subscription = createSeatBasedSubscription(orgId, { noOfSeats: 10 });
    subscriptionRepository.findLatestByOrgId.mockResolvedValue(subscription);
    mockInvitesAndUsers(2, 5);

    const query = new GetLatestSubscriptionQuery({ orgId });
    const result = await useCase.execute(query);

    expect(result.subscription).toBe(subscription);
    expect(result.availableSeats).toBe(3);
    expect(result.nextRenewalDate).toBeInstanceOf(Date);
  });

  it('should return a scheduled usage-based subscription that has not started yet', async () => {
    const futureStart = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const subscription = createUsageBasedSubscription(orgId, {
      startsAt: futureStart,
    });
    subscriptionRepository.findLatestByOrgId.mockResolvedValue(subscription);

    const query = new GetLatestSubscriptionQuery({ orgId });
    const result = await useCase.execute(query);

    expect(result.subscription).toBe(subscription);
    expect(result.availableSeats).toBeNull();
    expect(result.nextRenewalDate).toEqual(futureStart);
  });

  it('should return null for available seats on usage-based subscription', async () => {
    const subscription = createUsageBasedSubscription(orgId);
    subscriptionRepository.findLatestByOrgId.mockResolvedValue(subscription);

    const query = new GetLatestSubscriptionQuery({ orgId });
    const result = await useCase.execute(query);

    expect(result.availableSeats).toBeNull();
  });

  it('should not query invites or users for usage-based subscription', async () => {
    const subscription = createUsageBasedSubscription(orgId);
    subscriptionRepository.findLatestByOrgId.mockResolvedValue(subscription);

    const query = new GetLatestSubscriptionQuery({ orgId });
    await useCase.execute(query);

    expect(getInvitesByOrgUseCase.execute).not.toHaveBeenCalled();
    expect(findUsersByOrgIdUseCase.execute).not.toHaveBeenCalled();
  });
});
