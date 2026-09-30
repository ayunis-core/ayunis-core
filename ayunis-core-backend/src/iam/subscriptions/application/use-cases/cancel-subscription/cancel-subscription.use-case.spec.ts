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
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';

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

describe('CancelSubscriptionUseCase', () => {
  let useCase: CancelSubscriptionUseCase;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;
  let contextService: jest.Mocked<ContextService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

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
      ],
    }).compile();

    useCase = module.get(CancelSubscriptionUseCase);
    subscriptionRepository = module.get(SubscriptionRepository);
    contextService = module.get(ContextService);
    eventEmitter = module.get(EventEmitter2);

    contextService.get.mockImplementation((key) => {
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
