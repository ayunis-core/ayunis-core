import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { CreateSubscriptionUseCase } from './create-subscription.use-case';
import { CreateSubscriptionCommand } from './create-subscription.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { SendWebhookUseCase } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { Paginated } from 'src/common/pagination/paginated.entity';
import {
  SubscriptionAlreadyExistsError,
  InvalidSubscriptionDataError,
  TooManyUsedSeatsError,
} from '../../subscription.errors';
import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';

describe('CreateSubscriptionUseCase', () => {
  let useCase: CreateSubscriptionUseCase;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;
  let getInvitesByOrgUseCase: jest.Mocked<GetInvitesByOrgUseCase>;
  let findUsersByOrgIdUseCase: jest.Mocked<FindUsersByOrgIdUseCase>;
  let configService: jest.Mocked<ConfigService>;
  let contextService: jest.Mocked<ContextService>;

  const orgId = randomUUID();
  const requestingUserId = randomUUID();

  const baseBillingParams = {
    companyName: 'Gemeinde Musterstadt',
    street: 'Hauptstraße',
    houseNumber: '1',
    postalCode: '12345',
    city: 'Musterstadt',
    country: 'DE',
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSubscriptionUseCase,
        {
          provide: SubscriptionRepository,
          useValue: {
            create: jest.fn((sub: Subscription) => Promise.resolve(sub)),
            findByOrgId: jest.fn(),
          },
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
          provide: SendWebhookUseCase,
          useValue: { execute: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: ContextService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(CreateSubscriptionUseCase);
    subscriptionRepository = module.get(SubscriptionRepository);
    getInvitesByOrgUseCase = module.get(GetInvitesByOrgUseCase);
    findUsersByOrgIdUseCase = module.get(FindUsersByOrgIdUseCase);
    configService = module.get(ConfigService);
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
    }) as never);
  }

  function mockNoExistingSubscription(): void {
    subscriptionRepository.findByOrgId.mockResolvedValue([]);
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

  describe('usage-based subscription creation', () => {
    it('should create a UsageBasedSubscription when type is USAGE_BASED', async () => {
      setupSuperAdminContext();
      mockNoExistingSubscription();

      const command = new CreateSubscriptionCommand({
        orgId,
        requestingUserId,
        type: SubscriptionType.USAGE_BASED,
        monthlyCredits: 500,
        ...baseBillingParams,
      });

      const result = await useCase.execute(command);

      expect(result).toBeInstanceOf(UsageBasedSubscription);
      expect((result as UsageBasedSubscription).monthlyCredits).toBe(500);
      expect(result.orgId).toBe(orgId);
      expect(subscriptionRepository.create).toHaveBeenCalledWith(
        expect.any(UsageBasedSubscription),
      );
    });

    it('should set startsAt to the provided date for usage-based', async () => {
      setupSuperAdminContext();
      mockNoExistingSubscription();

      const futureDate = new Date('2026-07-01T00:00:00.000Z');
      const command = new CreateSubscriptionCommand({
        orgId,
        requestingUserId,
        type: SubscriptionType.USAGE_BASED,
        monthlyCredits: 500,
        startsAt: futureDate,
        ...baseBillingParams,
      });

      const result = await useCase.execute(command);

      expect(result).toBeInstanceOf(UsageBasedSubscription);
      expect(result.startsAt).toEqual(futureDate);
    });

    it('should reject usage-based subscription with monthlyCredits <= 0', async () => {
      setupSuperAdminContext();
      mockNoExistingSubscription();

      const command = new CreateSubscriptionCommand({
        orgId,
        requestingUserId,
        type: SubscriptionType.USAGE_BASED,
        monthlyCredits: 0,
        ...baseBillingParams,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidSubscriptionDataError,
      );
    });

    it('should reject usage-based subscription without monthlyCredits', async () => {
      setupSuperAdminContext();
      mockNoExistingSubscription();

      const command = new CreateSubscriptionCommand({
        orgId,
        requestingUserId,
        type: SubscriptionType.USAGE_BASED,
        ...baseBillingParams,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidSubscriptionDataError,
      );
    });

    it('should not query invites or users for usage-based subscription', async () => {
      setupSuperAdminContext();
      mockNoExistingSubscription();

      const command = new CreateSubscriptionCommand({
        orgId,
        requestingUserId,
        type: SubscriptionType.USAGE_BASED,
        monthlyCredits: 1000,
        ...baseBillingParams,
      });

      await useCase.execute(command);

      expect(getInvitesByOrgUseCase.execute).not.toHaveBeenCalled();
      expect(findUsersByOrgIdUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('seat-based subscription creation', () => {
    it('should create a SeatBasedSubscription when type is SEAT_BASED', async () => {
      setupSuperAdminContext();
      mockNoExistingSubscription();
      mockInvitesAndUsers(0, 1);
      configService.get.mockReturnValue(99.99);

      const command = new CreateSubscriptionCommand({
        orgId,
        requestingUserId,
        type: SubscriptionType.SEAT_BASED,
        noOfSeats: 5,
        ...baseBillingParams,
      });

      const result = await useCase.execute(command);

      expect(result).toBeInstanceOf(SeatBasedSubscription);
      expect((result as SeatBasedSubscription).noOfSeats).toBe(5);
      expect((result as SeatBasedSubscription).pricePerSeat).toBe(99.99);
    });

    it('should set startsAt and renewalCycleAnchor to the provided date for seat-based', async () => {
      setupSuperAdminContext();
      mockNoExistingSubscription();
      mockInvitesAndUsers(0, 1);
      configService.get.mockReturnValue(99.99);

      const futureDate = new Date('2026-07-01T00:00:00.000Z');
      const command = new CreateSubscriptionCommand({
        orgId,
        requestingUserId,
        type: SubscriptionType.SEAT_BASED,
        noOfSeats: 5,
        startsAt: futureDate,
        ...baseBillingParams,
      });

      const result = await useCase.execute(command);

      expect(result).toBeInstanceOf(SeatBasedSubscription);
      const seatBased = result as SeatBasedSubscription;
      expect(seatBased.startsAt).toEqual(futureDate);
      expect(seatBased.renewalCycleAnchor).toEqual(futureDate);
    });

    it('should default to SEAT_BASED when type is not specified', async () => {
      setupSuperAdminContext();
      mockNoExistingSubscription();
      mockInvitesAndUsers(0, 1);
      configService.get.mockReturnValue(99.99);

      const command = new CreateSubscriptionCommand({
        orgId,
        requestingUserId,
        noOfSeats: 3,
        ...baseBillingParams,
      });

      const result = await useCase.execute(command);

      expect(result).toBeInstanceOf(SeatBasedSubscription);
    });

    it('should reject seat-based subscription when users plus open invites exceed noOfSeats', async () => {
      setupSuperAdminContext();
      mockNoExistingSubscription();
      mockInvitesAndUsers(3, 4);
      configService.get.mockReturnValue(99.99);

      const command = new CreateSubscriptionCommand({
        orgId,
        requestingUserId,
        type: SubscriptionType.SEAT_BASED,
        noOfSeats: 5,
        ...baseBillingParams,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        TooManyUsedSeatsError,
      );
    });
  });

  describe('common validation', () => {
    it('should reject creation when a non-cancelled subscription exists', async () => {
      setupSuperAdminContext();
      subscriptionRepository.findByOrgId.mockResolvedValue([
        { cancelledAt: null } as unknown as Subscription,
      ]);

      const command = new CreateSubscriptionCommand({
        orgId,
        requestingUserId,
        type: SubscriptionType.USAGE_BASED,
        monthlyCredits: 500,
        ...baseBillingParams,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        SubscriptionAlreadyExistsError,
      );
    });

    it('should reject creation when a non-cancelled future-dated subscription already exists', async () => {
      setupSuperAdminContext();
      subscriptionRepository.findByOrgId.mockResolvedValue([
        {
          cancelledAt: null,
          startsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        } as unknown as Subscription,
      ]);

      const command = new CreateSubscriptionCommand({
        orgId,
        requestingUserId,
        type: SubscriptionType.USAGE_BASED,
        monthlyCredits: 500,
        ...baseBillingParams,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        SubscriptionAlreadyExistsError,
      );
    });

    it('should allow creation when only cancelled subscriptions exist', async () => {
      setupSuperAdminContext();
      const cancelledSub = new UsageBasedSubscription({
        orgId,
        monthlyCredits: 100,
        billingInfo: new SubscriptionBillingInfo(baseBillingParams),
      });
      cancelledSub.cancelledAt = new Date();
      subscriptionRepository.findByOrgId.mockResolvedValue([cancelledSub]);

      const command = new CreateSubscriptionCommand({
        orgId,
        requestingUserId,
        type: SubscriptionType.USAGE_BASED,
        monthlyCredits: 500,
        ...baseBillingParams,
      });

      const result = await useCase.execute(command);

      expect(result).toBeInstanceOf(UsageBasedSubscription);
    });

    it('should reject creation when a cancelled seat-based subscription is still within its billing period', async () => {
      setupSuperAdminContext();
      const now = new Date();
      const cancelledSeatSub = new SeatBasedSubscription({
        orgId,
        noOfSeats: 5,
        pricePerSeat: 99.99,
        renewalCycle: RenewalCycle.YEARLY,
        renewalCycleAnchor: new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate(),
        ),
        startsAt: new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate(),
        ),
        billingInfo: new SubscriptionBillingInfo(baseBillingParams),
      });
      cancelledSeatSub.cancelledAt = now;
      subscriptionRepository.findByOrgId.mockResolvedValue([cancelledSeatSub]);

      const command = new CreateSubscriptionCommand({
        orgId,
        requestingUserId,
        type: SubscriptionType.USAGE_BASED,
        monthlyCredits: 500,
        ...baseBillingParams,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        SubscriptionAlreadyExistsError,
      );
    });
  });
});
