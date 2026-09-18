import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { ListOrgSubscriptionsUseCase } from './list-org-subscriptions.use-case';
import { ListOrgSubscriptionsQuery } from './list-org-subscriptions.query';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { SubscriptionLifecycleStatus } from 'src/iam/subscriptions/domain/value-objects/subscription-lifecycle-status.enum';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { UnauthorizedSubscriptionAccessError } from 'src/iam/subscriptions/application/subscription.errors';

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
  orgId: UUID,
  overrides: Partial<{
    createdAt: Date;
    cancelledAt: Date | null;
    renewalCycleAnchor: Date;
    startsAt: Date;
  }> = {},
): SeatBasedSubscription {
  const anchor = overrides.renewalCycleAnchor ?? new Date('2025-01-01');
  return new SeatBasedSubscription({
    orgId,
    noOfSeats: 10,
    pricePerSeat: 9.99,
    renewalCycle: RenewalCycle.MONTHLY,
    renewalCycleAnchor: anchor,
    cancelledAt: overrides.cancelledAt ?? null,
    startsAt: overrides.startsAt ?? anchor,
    createdAt: overrides.createdAt,
    billingInfo: createBillingInfo(),
  });
}

function createUsageBased(
  orgId: UUID,
  overrides: Partial<{
    createdAt: Date;
    cancelledAt: Date | null;
    startsAt: Date;
  }> = {},
): UsageBasedSubscription {
  return new UsageBasedSubscription({
    orgId,
    monthlyCredits: 500,
    cancelledAt: overrides.cancelledAt ?? null,
    startsAt: overrides.startsAt ?? new Date('2025-01-01'),
    createdAt: overrides.createdAt,
    billingInfo: createBillingInfo(),
  });
}

describe('ListOrgSubscriptionsUseCase', () => {
  let useCase: ListOrgSubscriptionsUseCase;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;
  let contextService: jest.Mocked<ContextService>;

  const orgId = randomUUID();
  const requestingUserId = randomUUID();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListOrgSubscriptionsUseCase,
        {
          provide: SubscriptionRepository,
          useValue: { findByOrgId: jest.fn() },
        },
        {
          provide: ContextService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(ListOrgSubscriptionsUseCase);
    subscriptionRepository = module.get(SubscriptionRepository);
    contextService = module.get(ContextService);
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
    contextService.get.mockImplementation((key) => {
      if (key === 'systemRole') return SystemRole.SUPER_ADMIN;
      if (key === 'userId') return requestingUserId;
      if (key === 'role') return UserRole.ADMIN;
      if (key === 'orgId') return orgId;
      return undefined;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  function createQuery(): ListOrgSubscriptionsQuery {
    return new ListOrgSubscriptionsQuery(orgId);
  }

  it('throws when the requester is not a super admin', async () => {
    contextService.get.mockImplementation((key) => {
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      if (key === 'userId') return requestingUserId;
      if (key === 'role') return UserRole.ADMIN;
      if (key === 'orgId') return orgId;
      return undefined;
    });

    await expect(useCase.execute(createQuery())).rejects.toThrow(
      UnauthorizedSubscriptionAccessError,
    );
    expect(subscriptionRepository.findByOrgId).not.toHaveBeenCalled();
  });

  it('returns an empty list when the organization has no subscriptions', async () => {
    subscriptionRepository.findByOrgId.mockResolvedValue([]);

    const result = await useCase.execute(createQuery());

    expect(result.subscriptions).toEqual([]);
    expect(result.activeCount).toBe(0);
  });

  it('returns every subscription newest first and marks the latest', async () => {
    const historical = createSeatBased(orgId, {
      createdAt: new Date('2024-01-01'),
      cancelledAt: new Date('2024-06-01'),
      renewalCycleAnchor: new Date('2024-01-01'),
    });
    const current = createSeatBased(orgId, {
      createdAt: new Date('2025-01-01'),
    });
    subscriptionRepository.findByOrgId.mockResolvedValue([historical, current]);

    const result = await useCase.execute(createQuery());

    expect(result.subscriptions.map((item) => item.subscription.id)).toEqual([
      current.id,
      historical.id,
    ]);
    expect(result.subscriptions[0].isLatest).toBe(true);
    expect(result.subscriptions[1].isLatest).toBe(false);
    expect(result.subscriptions[0].status).toBe(
      SubscriptionLifecycleStatus.ACTIVE,
    );
    expect(result.subscriptions[1].status).toBe(
      SubscriptionLifecycleStatus.HISTORICAL,
    );
    expect(result.activeCount).toBe(1);
  });

  it('makes multiple currently serving subscriptions visible instead of selecting one', async () => {
    const firstActive = createUsageBased(orgId, {
      createdAt: new Date('2025-01-01'),
    });
    const secondActive = createSeatBased(orgId, {
      createdAt: new Date('2025-03-01'),
    });
    subscriptionRepository.findByOrgId.mockResolvedValue([
      firstActive,
      secondActive,
    ]);

    const result = await useCase.execute(createQuery());

    expect(result.subscriptions).toHaveLength(2);
    expect(result.activeCount).toBe(2);
    expect(
      result.subscriptions.every(
        (item) => item.status === SubscriptionLifecycleStatus.ACTIVE,
      ),
    ).toBe(true);
    expect(result.subscriptions.filter((item) => item.isLatest)).toHaveLength(
      1,
    );
  });

  it('counts a cancelled seat-based subscription still in period as active', async () => {
    const now = new Date();
    const anchor = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const cancelledServing = createSeatBased(orgId, {
      createdAt: new Date('2025-01-01'),
      cancelledAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      renewalCycleAnchor: anchor,
    });
    const replacement = createUsageBased(orgId, {
      createdAt: new Date('2025-06-01'),
    });
    subscriptionRepository.findByOrgId.mockResolvedValue([
      cancelledServing,
      replacement,
    ]);

    const result = await useCase.execute(createQuery());

    expect(result.activeCount).toBe(2);
    expect(
      result.subscriptions.find(
        (item) => item.subscription.id === cancelledServing.id,
      )?.status,
    ).toBe(SubscriptionLifecycleStatus.CANCELLED);
    expect(
      result.subscriptions.find(
        (item) => item.subscription.id === replacement.id,
      )?.status,
    ).toBe(SubscriptionLifecycleStatus.ACTIVE);
  });

  it('lists a seat-based subscription cancelled before start after that start date has passed', async () => {
    jest.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
    const startsAt = new Date('2026-01-01T00:00:00.000Z');
    const neverStarted = createSeatBased(orgId, {
      createdAt: new Date('2025-08-01T00:00:00.000Z'),
      startsAt,
      renewalCycleAnchor: startsAt,
      cancelledAt: new Date('2025-09-18T11:00:00.000Z'),
    });
    const replacement = createUsageBased(orgId, {
      createdAt: new Date('2025-09-18T11:05:00.000Z'),
    });
    subscriptionRepository.findByOrgId.mockResolvedValue([
      neverStarted,
      replacement,
    ]);

    const result = await useCase.execute(createQuery());

    const historical = result.subscriptions.find(
      (item) => item.subscription.id === neverStarted.id,
    );
    expect(result.subscriptions).toHaveLength(2);
    expect(historical?.status).toBe(SubscriptionLifecycleStatus.HISTORICAL);
    expect(historical?.nextRenewalDate).toEqual(startsAt);
    expect(result.activeCount).toBe(1);
  });
});
