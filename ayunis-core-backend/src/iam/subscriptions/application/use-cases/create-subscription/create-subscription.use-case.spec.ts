import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { CreateSubscriptionUseCase } from './create-subscription.use-case';
import { CreateSubscriptionCommand } from './create-subscription.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { HasActiveSubscriptionUseCase } from '../has-active-subscription/has-active-subscription.use-case';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
import { SubscriptionCreatedEvent } from '../../events/subscription-created.event';

describe('CreateSubscriptionUseCase', () => {
  let useCase: CreateSubscriptionUseCase;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;
  let hasActiveSubscriptionUseCase: jest.Mocked<HasActiveSubscriptionUseCase>;
  let getInvitesByOrgUseCase: jest.Mocked<GetInvitesByOrgUseCase>;
  let findUsersByOrgIdUseCase: jest.Mocked<FindUsersByOrgIdUseCase>;
  let configService: jest.Mocked<ConfigService>;
  let contextService: jest.Mocked<ContextService>;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emitAsync'>>;

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
          },
        },
        {
          provide: HasActiveSubscriptionUseCase,
          useValue: { execute: jest.fn() },
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
          provide: EventEmitter2,
          useValue: { emitAsync: jest.fn().mockResolvedValue([]) },
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
    hasActiveSubscriptionUseCase = module.get(HasActiveSubscriptionUseCase);
    getInvitesByOrgUseCase = module.get(GetInvitesByOrgUseCase);
    findUsersByOrgIdUseCase = module.get(FindUsersByOrgIdUseCase);
    configService = module.get(ConfigService);
    contextService = module.get(ContextService);
    eventEmitter = module.get(EventEmitter2);

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

  function mockNoActiveSubscription(): void {
    hasActiveSubscriptionUseCase.execute.mockResolvedValue({
      hasActiveSubscription: false,
      subscriptionType: null,
    });
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
      mockNoActiveSubscription();

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
      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        SubscriptionCreatedEvent.EVENT_NAME,
        expect.objectContaining({
          orgId,
          payload: expect.objectContaining({
            orgId,
            type: SubscriptionType.USAGE_BASED,
            monthlyCredits: 500,
          }),
        }),
      );
    });

    it('should reject usage-based subscription with monthlyCredits <= 0', async () => {
      setupSuperAdminContext();
      mockNoActiveSubscription();

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
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    });

    it('should reject usage-based subscription without monthlyCredits', async () => {
      setupSuperAdminContext();
      mockNoActiveSubscription();

      const command = new CreateSubscriptionCommand({
        orgId,
        requestingUserId,
        type: SubscriptionType.USAGE_BASED,
        ...baseBillingParams,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidSubscriptionDataError,
      );
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    });

    it('should not query invites or users for usage-based subscription', async () => {
      setupSuperAdminContext();
      mockNoActiveSubscription();

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
      mockNoActiveSubscription();
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
      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        SubscriptionCreatedEvent.EVENT_NAME,
        expect.objectContaining({
          orgId,
          payload: expect.objectContaining({
            orgId,
            type: SubscriptionType.SEAT_BASED,
            noOfSeats: 5,
            pricePerSeat: 99.99,
          }),
        }),
      );
    });

    it('should default to SEAT_BASED when type is not specified', async () => {
      setupSuperAdminContext();
      mockNoActiveSubscription();
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
      mockNoActiveSubscription();
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
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    });
  });

  describe('common validation', () => {
    it('should reject creation when subscription already exists', async () => {
      setupSuperAdminContext();
      hasActiveSubscriptionUseCase.execute.mockResolvedValue({
        hasActiveSubscription: true,
        subscriptionType: SubscriptionType.SEAT_BASED,
      });

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
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    });
  });
});
