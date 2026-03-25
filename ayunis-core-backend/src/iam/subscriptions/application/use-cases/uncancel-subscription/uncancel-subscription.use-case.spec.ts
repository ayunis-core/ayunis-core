import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UncancelSubscriptionUseCase } from './uncancel-subscription.use-case';
import { UncancelSubscriptionCommand } from './uncancel-subscription.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import {
  SubscriptionNotFoundError,
  SubscriptionNotCancelledError,
  SubscriptionExpiredError,
} from '../../subscription.errors';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { SendWebhookUseCase } from 'src/integrations/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

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
  }> = {},
): SeatBasedSubscription {
  return new SeatBasedSubscription({
    orgId: mockOrgId,
    noOfSeats: 10,
    pricePerSeat: 9.99,
    renewalCycle: RenewalCycle.MONTHLY,
    renewalCycleAnchor: overrides.renewalCycleAnchor ?? new Date('2025-01-01'),
    cancelledAt: overrides.cancelledAt ?? null,
    billingInfo: createBillingInfo(),
  });
}

function createUsageBased(
  overrides: Partial<{ cancelledAt: Date | null }> = {},
): UsageBasedSubscription {
  return new UsageBasedSubscription({
    orgId: mockOrgId,
    monthlyCredits: 1000,
    cancelledAt: overrides.cancelledAt ?? null,
    billingInfo: createBillingInfo(),
  });
}

describe('UncancelSubscriptionUseCase', () => {
  let useCase: UncancelSubscriptionUseCase;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;
  let contextService: jest.Mocked<ContextService>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UncancelSubscriptionUseCase,
        {
          provide: SubscriptionRepository,
          useValue: {
            findLatestByOrgId: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: SendWebhookUseCase,
          useValue: { execute: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: ContextService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(UncancelSubscriptionUseCase);
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

  const command = new UncancelSubscriptionCommand({
    orgId: mockOrgId,
    requestingUserId: mockUserId,
  });

  it('should throw SubscriptionNotFoundError when no subscription exists', async () => {
    subscriptionRepository.findLatestByOrgId.mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toThrow(
      SubscriptionNotFoundError,
    );
  });

  it('should throw SubscriptionNotCancelledError when subscription is not cancelled', async () => {
    subscriptionRepository.findLatestByOrgId.mockResolvedValue(
      createSeatBased({ cancelledAt: null }),
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      SubscriptionNotCancelledError,
    );
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
    subscriptionRepository.findLatestByOrgId.mockResolvedValue(subscription);
    subscriptionRepository.update.mockResolvedValue(subscription);

    await useCase.execute(command);

    expect(subscription.cancelledAt).toBeNull();
    expect(subscriptionRepository.update).toHaveBeenCalledWith(subscription);
  });

  it('should reject uncancelling a seat-based subscription past its billing period', async () => {
    const subscription = createSeatBased({
      cancelledAt: new Date('2024-01-15'),
      renewalCycleAnchor: new Date('2024-01-01'),
    });
    subscriptionRepository.findLatestByOrgId.mockResolvedValue(subscription);

    await expect(useCase.execute(command)).rejects.toThrow(
      SubscriptionExpiredError,
    );
  });

  it('should uncancel a usage-based subscription cancelled in the current month', async () => {
    const now = new Date();
    const cancelledAt = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const subscription = createUsageBased({ cancelledAt });
    subscriptionRepository.findLatestByOrgId.mockResolvedValue(subscription);
    subscriptionRepository.update.mockResolvedValue(subscription);

    await useCase.execute(command);

    expect(subscription.cancelledAt).toBeNull();
    expect(subscriptionRepository.update).toHaveBeenCalledWith(subscription);
  });

  it('should reject uncancelling a usage-based subscription cancelled in a previous month', async () => {
    const now = new Date();
    const previousMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15),
    );
    const subscription = createUsageBased({ cancelledAt: previousMonth });
    subscriptionRepository.findLatestByOrgId.mockResolvedValue(subscription);

    await expect(useCase.execute(command)).rejects.toThrow(
      SubscriptionExpiredError,
    );
  });
});
