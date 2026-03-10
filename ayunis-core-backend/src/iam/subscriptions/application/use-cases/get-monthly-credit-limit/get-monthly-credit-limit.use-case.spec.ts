import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetMonthlyCreditLimitUseCase } from './get-monthly-credit-limit.use-case';
import { GetMonthlyCreditLimitQuery } from './get-monthly-credit-limit.query';
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

describe('GetMonthlyCreditLimitUseCase', () => {
  let useCase: GetMonthlyCreditLimitUseCase;
  let mockSubscriptionRepository: { findByOrgId: jest.Mock };

  const orgId = 'org-id' as UUID;

  beforeAll(async () => {
    mockSubscriptionRepository = {
      findByOrgId: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMonthlyCreditLimitUseCase,
        {
          provide: SubscriptionRepository,
          useValue: mockSubscriptionRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetMonthlyCreditLimitUseCase>(
      GetMonthlyCreditLimitUseCase,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when no subscriptions exist', async () => {
    mockSubscriptionRepository.findByOrgId.mockResolvedValue([]);

    const result = await useCase.execute(new GetMonthlyCreditLimitQuery(orgId));

    expect(result).toEqual({ monthlyCredits: null });
  });

  it('should return null for seat-based subscription only', async () => {
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

    const result = await useCase.execute(new GetMonthlyCreditLimitQuery(orgId));

    expect(result).toEqual({ monthlyCredits: null });
  });

  it('should return monthlyCredits for active usage-based subscription', async () => {
    mockSubscriptionRepository.findByOrgId.mockResolvedValue([
      new UsageBasedSubscription({
        orgId,
        monthlyCredits: 5000,
        billingInfo: createBillingInfo(),
        cancelledAt: null,
      }),
    ]);

    const result = await useCase.execute(new GetMonthlyCreditLimitQuery(orgId));

    expect(result).toEqual({ monthlyCredits: 5000 });
  });

  it('should return null for cancelled usage-based subscription', async () => {
    mockSubscriptionRepository.findByOrgId.mockResolvedValue([
      new UsageBasedSubscription({
        orgId,
        monthlyCredits: 5000,
        billingInfo: createBillingInfo(),
        cancelledAt: new Date(),
      }),
    ]);

    const result = await useCase.execute(new GetMonthlyCreditLimitQuery(orgId));

    expect(result).toEqual({ monthlyCredits: null });
  });

  it('should find usage-based subscription among mixed types', async () => {
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

    const result = await useCase.execute(new GetMonthlyCreditLimitQuery(orgId));

    expect(result).toEqual({ monthlyCredits: 3000 });
  });
});
