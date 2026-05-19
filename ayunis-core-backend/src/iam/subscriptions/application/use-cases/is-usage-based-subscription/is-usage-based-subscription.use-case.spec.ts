import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { IsUsageBasedSubscriptionUseCase } from './is-usage-based-subscription.use-case';
import { IsUsageBasedSubscriptionQuery } from './is-usage-based-subscription.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { UsageBasedSubscription } from '../../../domain/usage-based-subscription.entity';
import { SeatBasedSubscription } from '../../../domain/seat-based-subscription.entity';
import { SubscriptionBillingInfo } from '../../../domain/subscription-billing-info.entity';
import type { UUID } from 'crypto';
import { RenewalCycle } from '../../../domain/value-objects/renewal-cycle.enum';

function createBillingInfo(): SubscriptionBillingInfo {
  return new SubscriptionBillingInfo({
    companyName: 'Stadtverwaltung Musterstadt',
    street: 'Rathausplatz',
    houseNumber: '1',
    postalCode: '12345',
    city: 'Musterstadt',
    country: 'DE',
  });
}

describe('IsUsageBasedSubscriptionUseCase', () => {
  let useCase: IsUsageBasedSubscriptionUseCase;
  let mockSubscriptionRepository: { findByOrgId: jest.Mock };

  const orgId = 'org-id' as UUID;

  beforeAll(async () => {
    mockSubscriptionRepository = {
      findByOrgId: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IsUsageBasedSubscriptionUseCase,
        {
          provide: SubscriptionRepository,
          useValue: mockSubscriptionRepository,
        },
      ],
    }).compile();

    useCase = module.get<IsUsageBasedSubscriptionUseCase>(
      IsUsageBasedSubscriptionUseCase,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when no subscriptions exist', async () => {
    mockSubscriptionRepository.findByOrgId.mockResolvedValue([]);

    const result = await useCase.execute(
      new IsUsageBasedSubscriptionQuery(orgId),
    );

    expect(result).toBe(false);
  });

  it('should return false for an active seat-based subscription', async () => {
    mockSubscriptionRepository.findByOrgId.mockResolvedValue([
      new SeatBasedSubscription({
        orgId,
        noOfSeats: 10,
        pricePerSeat: 50,
        renewalCycle: RenewalCycle.MONTHLY,
        renewalCycleAnchor: new Date(),
        billingInfo: createBillingInfo(),
      }),
    ]);

    const result = await useCase.execute(
      new IsUsageBasedSubscriptionQuery(orgId),
    );

    expect(result).toBe(false);
  });

  it('should return true for an active usage-based subscription', async () => {
    mockSubscriptionRepository.findByOrgId.mockResolvedValue([
      new UsageBasedSubscription({
        orgId,
        monthlyCredits: 5000,
        billingInfo: createBillingInfo(),
        cancelledAt: null,
      }),
    ]);

    const result = await useCase.execute(
      new IsUsageBasedSubscriptionQuery(orgId),
    );

    expect(result).toBe(true);
  });

  it('should return false when the only usage-based subscription is cancelled', async () => {
    mockSubscriptionRepository.findByOrgId.mockResolvedValue([
      new UsageBasedSubscription({
        orgId,
        monthlyCredits: 5000,
        billingInfo: createBillingInfo(),
        cancelledAt: new Date(),
      }),
    ]);

    const result = await useCase.execute(
      new IsUsageBasedSubscriptionQuery(orgId),
    );

    expect(result).toBe(false);
  });

  it('should return true when a usage-based subscription is active among mixed types', async () => {
    mockSubscriptionRepository.findByOrgId.mockResolvedValue([
      new SeatBasedSubscription({
        orgId,
        noOfSeats: 10,
        pricePerSeat: 50,
        renewalCycle: RenewalCycle.MONTHLY,
        renewalCycleAnchor: new Date(),
        billingInfo: createBillingInfo(),
      }),
      new UsageBasedSubscription({
        orgId,
        monthlyCredits: 3000,
        billingInfo: createBillingInfo(),
        cancelledAt: null,
      }),
    ]);

    const result = await useCase.execute(
      new IsUsageBasedSubscriptionQuery(orgId),
    );

    expect(result).toBe(true);
  });
});
