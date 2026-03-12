import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { GetActiveSubscriptionUseCase } from './get-active-subscription.use-case';
import { GetActiveSubscriptionQuery } from './get-active-subscription.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { Paginated } from 'src/common/pagination/paginated.entity';
import {
  SubscriptionNotFoundError,
  MultipleActiveSubscriptionsError,
  UnauthorizedSubscriptionAccessError,
} from '../../subscription.errors';

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
    noOfSeats: number;
  }> = {},
): SeatBasedSubscription {
  return new SeatBasedSubscription({
    orgId,
    noOfSeats: overrides.noOfSeats ?? 10,
    pricePerSeat: 9.99,
    renewalCycle: RenewalCycle.MONTHLY,
    renewalCycleAnchor: overrides.renewalCycleAnchor ?? new Date('2025-01-01'),
    cancelledAt: overrides.cancelledAt ?? null,
    billingInfo: createBillingInfo(),
  });
}

function createUsageBasedSubscription(
  orgId: UUID,
  overrides: Partial<{ cancelledAt: Date | null; monthlyCredits: number }> = {},
): UsageBasedSubscription {
  return new UsageBasedSubscription({
    orgId,
    monthlyCredits: overrides.monthlyCredits ?? 500,
    cancelledAt: overrides.cancelledAt ?? null,
    billingInfo: createBillingInfo(),
  });
}

describe('GetActiveSubscriptionUseCase', () => {
  let useCase: GetActiveSubscriptionUseCase;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;
  let getInvitesByOrgUseCase: jest.Mocked<GetInvitesByOrgUseCase>;
  let findUsersByOrgIdUseCase: jest.Mocked<FindUsersByOrgIdUseCase>;
  let contextService: jest.Mocked<ContextService>;

  const orgId = randomUUID();
  const requestingUserId = randomUUID();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetActiveSubscriptionUseCase,
        {
          provide: SubscriptionRepository,
          useValue: { findByOrgId: jest.fn() },
        },
        {
          provide: GetInvitesByOrgUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: FindUsersByOrgIdUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ContextService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetActiveSubscriptionUseCase);
    subscriptionRepository = module.get(SubscriptionRepository);
    getInvitesByOrgUseCase = module.get(GetInvitesByOrgUseCase);
    findUsersByOrgIdUseCase = module.get(FindUsersByOrgIdUseCase);
    contextService = module.get(ContextService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function setupSuperAdminContext(): void {
    contextService.get.mockImplementation(((key: string) => {
      if (key === 'systemRole') return SystemRole.SUPER_ADMIN;
      if (key === 'role') return UserRole.USER;
      if (key === 'orgId') return randomUUID();
      return undefined;
    }) as any);
  }

  function setupOrgAdminContext(contextOrgId: UUID): void {
    contextService.get.mockImplementation(((key: string) => {
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      if (key === 'role') return UserRole.ADMIN;
      if (key === 'orgId') return contextOrgId;
      return undefined;
    }) as any);
  }

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

  describe('authorization', () => {
    it('should throw UnauthorizedSubscriptionAccessError when user is not super admin or org admin', async () => {
      contextService.get.mockImplementation(((key: string) => {
        if (key === 'systemRole') return SystemRole.CUSTOMER;
        if (key === 'role') return UserRole.USER;
        if (key === 'orgId') return orgId;
        return undefined;
      }) as any);

      const query = new GetActiveSubscriptionQuery({
        orgId,
        requestingUserId,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        UnauthorizedSubscriptionAccessError,
      );
    });

    it('should allow super admin to access any org subscription', async () => {
      setupSuperAdminContext();
      const subscription = createSeatBasedSubscription(orgId);
      subscriptionRepository.findByOrgId.mockResolvedValue([subscription]);
      mockInvitesAndUsers(0, 3);

      const query = new GetActiveSubscriptionQuery({
        orgId,
        requestingUserId,
      });

      const result = await useCase.execute(query);

      expect(result.subscription).toBe(subscription);
    });

    it('should allow org admin to access their own org subscription', async () => {
      setupOrgAdminContext(orgId);
      const subscription = createUsageBasedSubscription(orgId);
      subscriptionRepository.findByOrgId.mockResolvedValue([subscription]);

      const query = new GetActiveSubscriptionQuery({
        orgId,
        requestingUserId,
      });

      const result = await useCase.execute(query);

      expect(result.subscription).toBe(subscription);
    });
  });

  describe('seat-based subscription', () => {
    it('should return subscription with computed available seats', async () => {
      setupSuperAdminContext();
      const subscription = createSeatBasedSubscription(orgId, {
        noOfSeats: 10,
      });
      subscriptionRepository.findByOrgId.mockResolvedValue([subscription]);
      mockInvitesAndUsers(2, 5);

      const query = new GetActiveSubscriptionQuery({
        orgId,
        requestingUserId,
      });

      const result = await useCase.execute(query);

      expect(result.subscription).toBe(subscription);
      expect(result.availableSeats).toBe(3); // 10 - 2 invites - 5 users
      expect(result.nextRenewalDate).toBeInstanceOf(Date);
    });

    it('should return negative available seats when over-allocated', async () => {
      setupSuperAdminContext();
      const subscription = createSeatBasedSubscription(orgId, {
        noOfSeats: 5,
      });
      subscriptionRepository.findByOrgId.mockResolvedValue([subscription]);
      mockInvitesAndUsers(3, 4);

      const query = new GetActiveSubscriptionQuery({
        orgId,
        requestingUserId,
      });

      const result = await useCase.execute(query);

      expect(result.availableSeats).toBe(-2); // 5 - 3 - 4
    });

    it('should compute next renewal date from anchor and current date', async () => {
      setupSuperAdminContext();
      const subscription = createSeatBasedSubscription(orgId, {
        renewalCycleAnchor: new Date('2025-01-01'),
      });
      subscriptionRepository.findByOrgId.mockResolvedValue([subscription]);
      mockInvitesAndUsers(0, 1);

      const query = new GetActiveSubscriptionQuery({
        orgId,
        requestingUserId,
      });

      const result = await useCase.execute(query);

      expect(result.nextRenewalDate).toBeInstanceOf(Date);
      expect(result.nextRenewalDate.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('usage-based subscription', () => {
    it('should return null for available seats', async () => {
      setupSuperAdminContext();
      const subscription = createUsageBasedSubscription(orgId);
      subscriptionRepository.findByOrgId.mockResolvedValue([subscription]);

      const query = new GetActiveSubscriptionQuery({
        orgId,
        requestingUserId,
      });

      const result = await useCase.execute(query);

      expect(result.subscription).toBe(subscription);
      expect(result.availableSeats).toBeNull();
    });

    it('should not query invites or users for usage-based subscription', async () => {
      setupSuperAdminContext();
      const subscription = createUsageBasedSubscription(orgId);
      subscriptionRepository.findByOrgId.mockResolvedValue([subscription]);

      const query = new GetActiveSubscriptionQuery({
        orgId,
        requestingUserId,
      });

      await useCase.execute(query);

      expect(getInvitesByOrgUseCase.execute).not.toHaveBeenCalled();
      expect(findUsersByOrgIdUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return first day of next month as renewal date', async () => {
      setupSuperAdminContext();
      const subscription = createUsageBasedSubscription(orgId);
      subscriptionRepository.findByOrgId.mockResolvedValue([subscription]);

      const query = new GetActiveSubscriptionQuery({
        orgId,
        requestingUserId,
      });

      const result = await useCase.execute(query);

      const now = new Date();
      const expectedRenewal = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
      );
      expect(result.nextRenewalDate).toEqual(expectedRenewal);
    });
  });

  describe('error cases', () => {
    it('should throw SubscriptionNotFoundError when no active subscriptions exist', async () => {
      setupSuperAdminContext();
      subscriptionRepository.findByOrgId.mockResolvedValue([]);

      const query = new GetActiveSubscriptionQuery({
        orgId,
        requestingUserId,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        SubscriptionNotFoundError,
      );
    });

    it('should throw MultipleActiveSubscriptionsError when more than one active subscription exists', async () => {
      setupSuperAdminContext();
      const sub1 = createSeatBasedSubscription(orgId);
      const sub2 = createUsageBasedSubscription(orgId);
      subscriptionRepository.findByOrgId.mockResolvedValue([sub1, sub2]);

      const query = new GetActiveSubscriptionQuery({
        orgId,
        requestingUserId,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        MultipleActiveSubscriptionsError,
      );
    });
  });
});
