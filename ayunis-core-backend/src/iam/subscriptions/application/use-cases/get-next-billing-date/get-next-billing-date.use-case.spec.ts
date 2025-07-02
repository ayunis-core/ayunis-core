import { Test, TestingModule } from '@nestjs/testing';
import { GetNextBillingDateUseCase } from './get-next-billing-date.use-case';
import { GetNextBillingDateQuery } from './get-next-billing-date.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { Subscription } from '../../../domain/subscription.entity';
import { BillingCycle } from '../../../domain/value-objects/billing-cycle.enum';
import { Org } from '../../../../orgs/domain/org.entity';

describe('GetNextBillingDateUseCase', () => {
  let useCase: GetNextBillingDateUseCase;
  let mockSubscriptionRepository: Partial<SubscriptionRepository>;

  const mockOrg = new Org({ name: 'Test Org' });

  beforeEach(async () => {
    mockSubscriptionRepository = {
      findByOrgId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetNextBillingDateUseCase,
        {
          provide: SubscriptionRepository,
          useValue: mockSubscriptionRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetNextBillingDateUseCase>(GetNextBillingDateUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('Monthly billing cycle', () => {
    it('should calculate next billing date for monthly subscription', async () => {
      const billingCycleAnchor = new Date('2024-01-15T00:00:00.000Z');
      const subscription = new Subscription({
        org: mockOrg,
        pricePerSeat: 10,
        billingCycle: BillingCycle.MONTHLY,
        billingCycleAnchor,
      });

      const query = new GetNextBillingDateQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      // Mock current date to be January 20, 2024
      const mockDate = new Date('2024-01-20T00:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation((date?: any) => {
        if (date) return new Date(date);
        return mockDate;
      });

      const result = await useCase.execute(query);

      expect(result).toEqual(new Date('2024-02-15T00:00:00.000Z'));
      expect(mockSubscriptionRepository.findByOrgId).toHaveBeenCalledWith(
        'org-id',
      );
    });

    it('should handle month overflow (Jan 31 -> Feb 28/29)', async () => {
      const billingCycleAnchor = new Date('2024-01-31T00:00:00.000Z');
      const subscription = new Subscription({
        org: mockOrg,
        pricePerSeat: 10,
        billingCycle: BillingCycle.MONTHLY,
        billingCycleAnchor,
      });

      const query = new GetNextBillingDateQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      // Mock current date to be February 15, 2024
      const mockDate = new Date('2024-02-15T00:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation((date?: any) => {
        if (date) return new Date(date);
        return mockDate;
      });

      const result = await useCase.execute(query);

      // February 2024 has 29 days (leap year), so Jan 31 -> Feb 29
      expect(result).toEqual(new Date('2024-02-29T00:00:00.000Z'));
    });

    it('should handle month overflow in non-leap year (Jan 31 -> Feb 28)', async () => {
      const billingCycleAnchor = new Date('2023-01-31T00:00:00.000Z');
      const subscription = new Subscription({
        org: mockOrg,
        pricePerSeat: 10,
        billingCycle: BillingCycle.MONTHLY,
        billingCycleAnchor,
      });

      const query = new GetNextBillingDateQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      // Mock current date to be February 15, 2023
      const mockDate = new Date('2023-02-15T00:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation((date?: any) => {
        if (date) return new Date(date);
        return mockDate;
      });

      const result = await useCase.execute(query);

      // February 2023 has 28 days (non-leap year), so Jan 31 -> Feb 28
      expect(result).toEqual(new Date('2023-02-28T00:00:00.000Z'));
    });

    it('should calculate future billing date when multiple months have passed', async () => {
      const billingCycleAnchor = new Date('2024-01-15T00:00:00.000Z');
      const subscription = new Subscription({
        org: mockOrg,
        pricePerSeat: 10,
        billingCycle: BillingCycle.MONTHLY,
        billingCycleAnchor,
      });

      const query = new GetNextBillingDateQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      // Mock current date to be March 20, 2024 (past Feb 15)
      const mockDate = new Date('2024-03-20T00:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation((date?: any) => {
        if (date) return new Date(date);
        return mockDate;
      });

      const result = await useCase.execute(query);

      expect(result).toEqual(new Date('2024-04-15T00:00:00.000Z'));
    });
  });

  describe('Yearly billing cycle', () => {
    it('should calculate next billing date for yearly subscription', async () => {
      const billingCycleAnchor = new Date('2024-03-01T00:00:00.000Z');
      const subscription = new Subscription({
        org: mockOrg,
        pricePerSeat: 100,
        billingCycle: BillingCycle.YEARLY,
        billingCycleAnchor,
      });

      const query = new GetNextBillingDateQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      // Mock current date to be June 1, 2024
      const mockDate = new Date('2024-06-01T00:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation((date?: any) => {
        if (date) return new Date(date);
        return mockDate;
      });

      const result = await useCase.execute(query);

      expect(result).toEqual(new Date('2025-03-01T00:00:00.000Z'));
    });

    it('should handle leap year edge case (Feb 29 -> Feb 28)', async () => {
      const billingCycleAnchor = new Date('2024-02-29T00:00:00.000Z'); // Leap year
      const subscription = new Subscription({
        org: mockOrg,
        pricePerSeat: 100,
        billingCycle: BillingCycle.YEARLY,
        billingCycleAnchor,
      });

      const query = new GetNextBillingDateQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      // Mock current date to be March 15, 2024
      const mockDate = new Date('2024-03-15T00:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation((date?: any) => {
        if (date) return new Date(date);
        return mockDate;
      });

      const result = await useCase.execute(query);

      // 2025 is not a leap year, so Feb 29 -> Feb 28
      expect(result).toEqual(new Date('2025-02-28T00:00:00.000Z'));
    });

    it('should calculate future billing date when multiple years have passed', async () => {
      const billingCycleAnchor = new Date('2022-03-01T00:00:00.000Z');
      const subscription = new Subscription({
        org: mockOrg,
        pricePerSeat: 100,
        billingCycle: BillingCycle.YEARLY,
        billingCycleAnchor,
      });

      const query = new GetNextBillingDateQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      // Mock current date to be April 1, 2024 (past multiple billing dates)
      const mockDate = new Date('2024-04-01T00:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation((date?: any) => {
        if (date) return new Date(date);
        return mockDate;
      });

      const result = await useCase.execute(query);

      expect(result).toEqual(new Date('2025-03-01T00:00:00.000Z'));
    });
  });

  describe('Cancelled subscriptions', () => {
    it('should return cancellation date for cancelled subscription', async () => {
      const billingCycleAnchor = new Date('2024-01-15T00:00:00.000Z');
      const cancelledAt = new Date('2024-02-20T00:00:00.000Z');
      const subscription = new Subscription({
        org: mockOrg,
        pricePerSeat: 10,
        billingCycle: BillingCycle.MONTHLY,
        billingCycleAnchor,
        cancelledAt,
      });

      const query = new GetNextBillingDateQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      const result = await useCase.execute(query);

      expect(result).toEqual(cancelledAt);
    });
  });

  describe('Edge cases and errors', () => {
    it('should throw error when subscription is not found', async () => {
      const query = new GetNextBillingDateQuery('non-existent-org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(null);

      await expect(useCase.execute(query)).rejects.toThrow(
        'Subscription not found',
      );
      expect(mockSubscriptionRepository.findByOrgId).toHaveBeenCalledWith(
        'non-existent-org-id',
      );
    });

    it('should handle repository errors', async () => {
      const query = new GetNextBillingDateQuery('org-id' as any);
      const error = new Error('Database connection failed');

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockRejectedValue(error);

      await expect(useCase.execute(query)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle current date exactly matching billing cycle anchor', async () => {
      const billingCycleAnchor = new Date('2024-01-15T00:00:00.000Z');
      const subscription = new Subscription({
        org: mockOrg,
        pricePerSeat: 10,
        billingCycle: BillingCycle.MONTHLY,
        billingCycleAnchor,
      });

      const query = new GetNextBillingDateQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      // Mock current date to be exactly the billing cycle anchor
      const mockDate = new Date('2024-01-15T00:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation((date?: any) => {
        if (date) return new Date(date);
        return mockDate;
      });

      const result = await useCase.execute(query);

      expect(result).toEqual(new Date('2024-02-15T00:00:00.000Z'));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});
