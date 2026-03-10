import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CheckCreditBudgetUseCase } from './check-credit-budget.use-case';
import { CheckCreditBudgetQuery } from './check-credit-budget.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { GetMonthlyCreditUsageUseCase } from '../../../../../domain/usage/application/use-cases/get-monthly-credit-usage/get-monthly-credit-usage.use-case';
import { SeatBasedSubscription } from '../../../domain/seat-based-subscription.entity';
import { UsageBasedSubscription } from '../../../domain/usage-based-subscription.entity';
import { SubscriptionBillingInfo } from '../../../domain/subscription-billing-info.entity';
import { CreditBudgetExceededError } from '../../subscription.errors';
import type { UUID } from 'crypto';
import { RenewalCycle } from '../../../domain/value-objects/renewal-cycle.enum';

function createBillingInfo(): SubscriptionBillingInfo {
  return new SubscriptionBillingInfo({
    companyName: 'Test GmbH',
    street: 'Teststraße',
    houseNumber: '1',
    postalCode: '12345',
    city: 'Teststadt',
    country: 'DE',
  });
}

describe('CheckCreditBudgetUseCase', () => {
  let useCase: CheckCreditBudgetUseCase;
  let mockSubscriptionRepository: { findByOrgId: jest.Mock };
  let mockGetMonthlyCreditUsage: { execute: jest.Mock };

  const orgId = 'org-id' as UUID;

  const createUsageBasedSubscription = (
    monthlyCredits: number,
    cancelledAt?: Date,
  ): UsageBasedSubscription =>
    new UsageBasedSubscription({
      orgId,
      monthlyCredits,
      billingInfo: createBillingInfo(),
      cancelledAt: cancelledAt ?? null,
    });

  const createSeatBasedSubscription = (): SeatBasedSubscription =>
    new SeatBasedSubscription({
      orgId,
      noOfSeats: 10,
      pricePerSeat: 50,
      renewalCycle: RenewalCycle.MONTHLY,
      renewalCycleAnchor: new Date(),
      billingInfo: createBillingInfo(),
    });

  beforeAll(async () => {
    mockSubscriptionRepository = {
      findByOrgId: jest.fn().mockResolvedValue([]),
    };

    mockGetMonthlyCreditUsage = {
      execute: jest.fn().mockResolvedValue({ creditsUsed: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckCreditBudgetUseCase,
        {
          provide: SubscriptionRepository,
          useValue: mockSubscriptionRepository,
        },
        {
          provide: GetMonthlyCreditUsageUseCase,
          useValue: mockGetMonthlyCreditUsage,
        },
      ],
    }).compile();

    useCase = module.get<CheckCreditBudgetUseCase>(CheckCreditBudgetUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass through when no subscription exists', async () => {
    mockSubscriptionRepository.findByOrgId.mockResolvedValue([]);

    await expect(
      useCase.execute(new CheckCreditBudgetQuery(orgId)),
    ).resolves.toBeUndefined();
    expect(mockGetMonthlyCreditUsage.execute).not.toHaveBeenCalled();
  });

  it('should pass through for seat-based subscription', async () => {
    mockSubscriptionRepository.findByOrgId.mockResolvedValue([
      createSeatBasedSubscription(),
    ]);

    await expect(
      useCase.execute(new CheckCreditBudgetQuery(orgId)),
    ).resolves.toBeUndefined();
    expect(mockGetMonthlyCreditUsage.execute).not.toHaveBeenCalled();
  });

  it('should pass through when credits remain', async () => {
    mockSubscriptionRepository.findByOrgId.mockResolvedValue([
      createUsageBasedSubscription(1000),
    ]);
    mockGetMonthlyCreditUsage.execute.mockResolvedValue({
      creditsUsed: 500,
    });

    await expect(
      useCase.execute(new CheckCreditBudgetQuery(orgId)),
    ).resolves.toBeUndefined();
  });

  it('should throw CreditBudgetExceededError when credits exhausted', async () => {
    mockSubscriptionRepository.findByOrgId.mockResolvedValue([
      createUsageBasedSubscription(1000),
    ]);
    mockGetMonthlyCreditUsage.execute.mockResolvedValue({
      creditsUsed: 1000,
    });

    await expect(
      useCase.execute(new CheckCreditBudgetQuery(orgId)),
    ).rejects.toThrow(CreditBudgetExceededError);
  });

  it('should throw CreditBudgetExceededError when credits exceeded', async () => {
    mockSubscriptionRepository.findByOrgId.mockResolvedValue([
      createUsageBasedSubscription(1000),
    ]);
    mockGetMonthlyCreditUsage.execute.mockResolvedValue({
      creditsUsed: 1500,
    });

    await expect(
      useCase.execute(new CheckCreditBudgetQuery(orgId)),
    ).rejects.toThrow(CreditBudgetExceededError);
  });

  it('should ignore cancelled usage-based subscriptions', async () => {
    mockSubscriptionRepository.findByOrgId.mockResolvedValue([
      createUsageBasedSubscription(1000, new Date()),
    ]);

    await expect(
      useCase.execute(new CheckCreditBudgetQuery(orgId)),
    ).resolves.toBeUndefined();
    expect(mockGetMonthlyCreditUsage.execute).not.toHaveBeenCalled();
  });

  it('should skip seat-based and find active usage-based subscription', async () => {
    mockSubscriptionRepository.findByOrgId.mockResolvedValue([
      createSeatBasedSubscription(),
      createUsageBasedSubscription(1000),
    ]);
    mockGetMonthlyCreditUsage.execute.mockResolvedValue({
      creditsUsed: 500,
    });

    await expect(
      useCase.execute(new CheckCreditBudgetQuery(orgId)),
    ).resolves.toBeUndefined();
    expect(mockGetMonthlyCreditUsage.execute).toHaveBeenCalled();
  });
});
