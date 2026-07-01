import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { ChangeSubscriptionUseCase } from './change-subscription.use-case';
import { ChangeSubscriptionCommand } from './change-subscription.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { SubscriptionFactory } from '../../services/subscription-factory.service';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import { OldSubscriptionDisposition } from 'src/iam/subscriptions/domain/value-objects/old-subscription-disposition.enum';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import {
  SubscriptionNotFoundError,
  TooManyUsedSeatsError,
} from '../../subscription.errors';
import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { SubscriptionCreatedEvent } from '../../events/subscription-created.event';
import { SubscriptionCancelledEvent } from '../../events/subscription-cancelled.event';
import type { ReplaceSubscriptionParams } from '../../ports/subscription.repository';

describe('ChangeSubscriptionUseCase', () => {
  let useCase: ChangeSubscriptionUseCase;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;
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

  function billingInfo(): SubscriptionBillingInfo {
    return new SubscriptionBillingInfo(baseBillingParams);
  }

  function existingSeatBased(): SeatBasedSubscription {
    return new SeatBasedSubscription({
      orgId,
      noOfSeats: 5,
      pricePerSeat: 99.99,
      renewalCycle: RenewalCycle.YEARLY,
      renewalCycleAnchor: new Date('2026-01-01T00:00:00.000Z'),
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      billingInfo: billingInfo(),
    });
  }

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangeSubscriptionUseCase,
        SubscriptionFactory,
        {
          provide: SubscriptionRepository,
          useValue: {
            findLatestByOrgId: jest.fn(),
            replace: jest.fn((params: ReplaceSubscriptionParams) =>
              Promise.resolve(params.newSubscription),
            ),
          },
        },
        { provide: GetInvitesByOrgUseCase, useValue: { execute: jest.fn() } },
        { provide: FindUsersByOrgIdUseCase, useValue: { execute: jest.fn() } },
        {
          provide: EventEmitter2,
          useValue: { emitAsync: jest.fn().mockResolvedValue([]) },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: ContextService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    useCase = module.get(ChangeSubscriptionUseCase);
    subscriptionRepository = module.get(SubscriptionRepository);
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

  function mockCurrentSubscription(subscription: Subscription): void {
    subscriptionRepository.findLatestByOrgId.mockResolvedValue(subscription);
  }

  function mockInvitesAndUsers(openInvites: number, userCount: number): void {
    getInvitesByOrgUseCase.execute.mockResolvedValue(
      new Paginated({ data: [], limit: 1000, offset: 0, total: openInvites }),
    );
    findUsersByOrgIdUseCase.execute.mockResolvedValue(
      new Paginated({ data: [], limit: 1000, offset: 0, total: userCount }),
    );
  }

  function seatToUsageCommand(
    disposition: OldSubscriptionDisposition,
  ): ChangeSubscriptionCommand {
    return new ChangeSubscriptionCommand({
      orgId,
      requestingUserId,
      disposition,
      type: SubscriptionType.USAGE_BASED,
      monthlyCredits: 1000,
      ...baseBillingParams,
    });
  }

  describe('seat-based → usage-based', () => {
    it('replaces with a usage-based subscription and emits created + cancelled on CANCEL', async () => {
      setupSuperAdminContext();
      mockCurrentSubscription(existingSeatBased());

      const result = await useCase.execute(
        seatToUsageCommand(OldSubscriptionDisposition.CANCEL),
      );

      expect(result).toBeInstanceOf(UsageBasedSubscription);
      expect((result as UsageBasedSubscription).monthlyCredits).toBe(1000);

      const replaceArg = subscriptionRepository.replace.mock.calls[0][0];
      expect(replaceArg.disposition).toBe(OldSubscriptionDisposition.CANCEL);
      expect(replaceArg.newSubscription).toBeInstanceOf(UsageBasedSubscription);

      const emittedEvents = eventEmitter.emitAsync.mock.calls.map((c) => c[0]);
      expect(emittedEvents).toContain(SubscriptionCancelledEvent.EVENT_NAME);
      expect(emittedEvents).toContain(SubscriptionCreatedEvent.EVENT_NAME);

      // The cancelled event must carry a cancelledAt matching the now-persisted
      // soft-cancellation, not the null it had before replace().
      const cancelledEvent = eventEmitter.emitAsync.mock.calls.find(
        (c) => c[0] === SubscriptionCancelledEvent.EVENT_NAME,
      )?.[1] as SubscriptionCancelledEvent;
      expect(cancelledEvent.payload.cancelledAt).toBeInstanceOf(Date);
    });

    it('does NOT emit cancelled on DELETE, only created', async () => {
      setupSuperAdminContext();
      mockCurrentSubscription(existingSeatBased());

      await useCase.execute(
        seatToUsageCommand(OldSubscriptionDisposition.DELETE),
      );

      const replaceArg = subscriptionRepository.replace.mock.calls[0][0];
      expect(replaceArg.disposition).toBe(OldSubscriptionDisposition.DELETE);

      const emittedEvents = eventEmitter.emitAsync.mock.calls.map((c) => c[0]);
      expect(emittedEvents).not.toContain(
        SubscriptionCancelledEvent.EVENT_NAME,
      );
      expect(emittedEvents).toContain(SubscriptionCreatedEvent.EVENT_NAME);
    });

    it('passes the current subscription id as the one to replace', async () => {
      setupSuperAdminContext();
      const current = existingSeatBased();
      mockCurrentSubscription(current);

      await useCase.execute(
        seatToUsageCommand(OldSubscriptionDisposition.CANCEL),
      );

      expect(
        subscriptionRepository.replace.mock.calls[0][0].oldSubscriptionId,
      ).toBe(current.id);
    });
  });

  describe('usage-based → seat-based', () => {
    function existingUsageBased(): UsageBasedSubscription {
      return new UsageBasedSubscription({
        orgId,
        monthlyCredits: 500,
        startsAt: new Date('2026-01-01T00:00:00.000Z'),
        billingInfo: billingInfo(),
      });
    }

    it('replaces with a seat-based subscription using configured price', async () => {
      setupSuperAdminContext();
      mockCurrentSubscription(existingUsageBased());
      mockInvitesAndUsers(0, 2);
      configService.get.mockReturnValue(99.99);

      const command = new ChangeSubscriptionCommand({
        orgId,
        requestingUserId,
        disposition: OldSubscriptionDisposition.CANCEL,
        type: SubscriptionType.SEAT_BASED,
        noOfSeats: 10,
        ...baseBillingParams,
      });

      const result = await useCase.execute(command);

      expect(result).toBeInstanceOf(SeatBasedSubscription);
      expect((result as SeatBasedSubscription).noOfSeats).toBe(10);
      expect((result as SeatBasedSubscription).pricePerSeat).toBe(99.99);
    });
  });

  describe('validation happens before mutating the old subscription', () => {
    it('throws TooManyUsedSeatsError and never calls replace', async () => {
      setupSuperAdminContext();
      mockCurrentSubscription(existingSeatBased());
      mockInvitesAndUsers(3, 4); // 7 used > 5 seats
      configService.get.mockReturnValue(99.99);

      const command = new ChangeSubscriptionCommand({
        orgId,
        requestingUserId,
        disposition: OldSubscriptionDisposition.DELETE,
        type: SubscriptionType.SEAT_BASED,
        noOfSeats: 5,
        ...baseBillingParams,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        TooManyUsedSeatsError,
      );
      expect(subscriptionRepository.replace).not.toHaveBeenCalled();
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    });
  });

  describe('replaceable subscription selection', () => {
    it('throws SubscriptionNotFoundError when no subscription exists', async () => {
      setupSuperAdminContext();
      subscriptionRepository.findLatestByOrgId.mockResolvedValue(null);

      await expect(
        useCase.execute(seatToUsageCommand(OldSubscriptionDisposition.CANCEL)),
      ).rejects.toThrow(SubscriptionNotFoundError);
      expect(subscriptionRepository.replace).not.toHaveBeenCalled();
    });

    it('replaces the latest subscription even when it is already cancelled', async () => {
      setupSuperAdminContext();
      const cancelled = existingSeatBased();
      cancelled.cancelledAt = new Date();
      mockCurrentSubscription(cancelled);

      await useCase.execute(
        seatToUsageCommand(OldSubscriptionDisposition.CANCEL),
      );

      expect(
        subscriptionRepository.replace.mock.calls[0][0].oldSubscriptionId,
      ).toBe(cancelled.id);
    });
  });
});
