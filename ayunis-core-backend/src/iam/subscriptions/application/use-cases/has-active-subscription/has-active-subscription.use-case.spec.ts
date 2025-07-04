import { Test, TestingModule } from '@nestjs/testing';
import { HasActiveSubscriptionUseCase } from './has-active-subscription.use-case';
import { HasActiveSubscriptionQuery } from './has-active-subscription.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { Subscription } from '../../../domain/subscription.entity';
import { RenewalCycle } from '../../../domain/value-objects/renewal-cycle.enum';
import { Org } from '../../../../orgs/domain/org.entity';

describe('HasActiveSubscriptionUseCase', () => {
  let useCase: HasActiveSubscriptionUseCase;
  let mockSubscriptionRepository: Partial<SubscriptionRepository>;

  const mockOrg = new Org({ name: 'Test Org' });

  beforeEach(async () => {
    mockSubscriptionRepository = {
      findByOrgId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HasActiveSubscriptionUseCase,
        {
          provide: SubscriptionRepository,
          useValue: mockSubscriptionRepository,
        },
      ],
    }).compile();

    useCase = module.get<HasActiveSubscriptionUseCase>(
      HasActiveSubscriptionUseCase,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('Basic cases', () => {
    it('should return false when no subscription exists', async () => {
      const query = new HasActiveSubscriptionQuery(
        'non-existent-org-id' as any,
      );

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(null);

      const result = await useCase.execute(query);

      expect(result).toBe(false);
      expect(mockSubscriptionRepository.findByOrgId).toHaveBeenCalledWith(
        'non-existent-org-id',
      );
    });

    it('should return true for active subscription (not cancelled)', async () => {
      const billingCycleAnchor = new Date('2024-01-15T00:00:00.000Z');
      const subscription = new Subscription({
        orgId: mockOrg.id,
        pricePerSeat: 10,
        noOfSeats: 1,
        renewalCycle: RenewalCycle.MONTHLY,
        renewalCycleAnchor: billingCycleAnchor,
        cancelledAt: null,
      });

      const query = new HasActiveSubscriptionQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      const result = await useCase.execute(query);

      expect(result).toBe(true);
      expect(mockSubscriptionRepository.findByOrgId).toHaveBeenCalledWith(
        'org-id',
      );
    });
  });

  describe('Cancelled subscriptions - Monthly billing', () => {
    it('should return true when cancelled but still within current billing period', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-02-10T00:00:00.000Z')); // Before next billing date

      const billingCycleAnchor = new Date('2024-01-15T00:00:00.000Z');
      const cancelledAt = new Date('2024-01-20T00:00:00.000Z');
      const subscription = new Subscription({
        orgId: mockOrg.id,
        pricePerSeat: 10,
        noOfSeats: 1,
        renewalCycle: RenewalCycle.MONTHLY,
        renewalCycleAnchor: billingCycleAnchor,
        cancelledAt,
      });

      const query = new HasActiveSubscriptionQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      const result = await useCase.execute(query);

      expect(result).toBe(true);
    });

    it('should return false when cancelled and past the last billing date', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-02-16T00:00:00.000Z')); // After next billing date

      const billingCycleAnchor = new Date('2024-01-15T00:00:00.000Z');
      const cancelledAt = new Date('2024-01-20T00:00:00.000Z');
      const subscription = new Subscription({
        orgId: mockOrg.id,
        pricePerSeat: 10,
        noOfSeats: 1,
        renewalCycle: RenewalCycle.MONTHLY,
        renewalCycleAnchor: billingCycleAnchor,
        cancelledAt,
      });

      const query = new HasActiveSubscriptionQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      const result = await useCase.execute(query);

      expect(result).toBe(false);
    });

    it('should return false when cancelled and exactly on the last billing date', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-02-15T00:00:00.000Z')); // Exactly on billing date

      const billingCycleAnchor = new Date('2024-01-15T00:00:00.000Z');
      const cancelledAt = new Date('2024-01-20T00:00:00.000Z');
      const subscription = new Subscription({
        orgId: mockOrg.id,
        pricePerSeat: 10,
        noOfSeats: 1,
        renewalCycle: RenewalCycle.MONTHLY,
        renewalCycleAnchor: billingCycleAnchor,
        cancelledAt,
      });

      const query = new HasActiveSubscriptionQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      const result = await useCase.execute(query);

      expect(result).toBe(false);
    });

    it('should handle month overflow (Jan 31 -> Feb 29 in leap year)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-02-28T00:00:00.000Z')); // Before leap day

      const billingCycleAnchor = new Date('2024-01-31T00:00:00.000Z');
      const cancelledAt = new Date('2024-02-05T00:00:00.000Z');
      const subscription = new Subscription({
        orgId: mockOrg.id,
        pricePerSeat: 10,
        noOfSeats: 1,
        renewalCycle: RenewalCycle.MONTHLY,
        renewalCycleAnchor: billingCycleAnchor,
        cancelledAt,
      });

      const query = new HasActiveSubscriptionQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      const result = await useCase.execute(query);

      expect(result).toBe(true);
    });

    it('should handle month overflow (Jan 31 -> Feb 28 in non-leap year)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-03-01T00:00:00.000Z')); // After Feb 28

      const billingCycleAnchor = new Date('2023-01-31T00:00:00.000Z');
      const cancelledAt = new Date('2023-02-05T00:00:00.000Z');
      const subscription = new Subscription({
        orgId: mockOrg.id,
        pricePerSeat: 10,
        noOfSeats: 1,
        renewalCycle: RenewalCycle.MONTHLY,
        renewalCycleAnchor: billingCycleAnchor,
        cancelledAt,
      });

      const query = new HasActiveSubscriptionQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      const result = await useCase.execute(query);

      expect(result).toBe(false);
    });

    it('should handle cancellation in different month than billing anchor - still active', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-03-12T00:00:00.000Z')); // Before March 15 (last billing date)

      const billingCycleAnchor = new Date('2024-01-15T00:00:00.000Z');
      const cancelledAt = new Date('2024-03-10T00:00:00.000Z'); // Cancelled in March
      const subscription = new Subscription({
        orgId: mockOrg.id,
        pricePerSeat: 10,
        noOfSeats: 1,
        renewalCycle: RenewalCycle.MONTHLY,
        renewalCycleAnchor: billingCycleAnchor,
        cancelledAt,
      });

      const query = new HasActiveSubscriptionQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      const result = await useCase.execute(query);

      expect(result).toBe(true);
    });

    it('should handle cancellation in different month than billing anchor - expired', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-03-20T00:00:00.000Z')); // After March 15 (last billing date)

      const billingCycleAnchor = new Date('2024-01-15T00:00:00.000Z');
      const cancelledAt = new Date('2024-03-10T00:00:00.000Z'); // Cancelled in March
      const subscription = new Subscription({
        orgId: mockOrg.id,
        pricePerSeat: 10,
        noOfSeats: 1,
        renewalCycle: RenewalCycle.MONTHLY,
        renewalCycleAnchor: billingCycleAnchor,
        cancelledAt,
      });

      const query = new HasActiveSubscriptionQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      const result = await useCase.execute(query);

      expect(result).toBe(false);
    });
  });

  describe('Cancelled subscriptions - Yearly billing', () => {
    it('should return true when cancelled but still within current billing period', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-12-31T00:00:00.000Z')); // Before next billing date

      const billingCycleAnchor = new Date('2024-01-15T00:00:00.000Z');
      const cancelledAt = new Date('2024-06-10T00:00:00.000Z');
      const subscription = new Subscription({
        orgId: mockOrg.id,
        pricePerSeat: 100,
        noOfSeats: 1,
        renewalCycle: RenewalCycle.YEARLY,
        renewalCycleAnchor: billingCycleAnchor,
        cancelledAt,
      });

      const query = new HasActiveSubscriptionQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      const result = await useCase.execute(query);

      expect(result).toBe(true);
    });

    it('should return false when cancelled and past the last billing date', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-16T00:00:00.000Z')); // After billing date

      const billingCycleAnchor = new Date('2024-01-15T00:00:00.000Z');
      const cancelledAt = new Date('2024-06-10T00:00:00.000Z');
      const subscription = new Subscription({
        orgId: mockOrg.id,
        pricePerSeat: 100,
        noOfSeats: 1,
        renewalCycle: RenewalCycle.YEARLY,
        renewalCycleAnchor: billingCycleAnchor,
        cancelledAt,
      });

      const query = new HasActiveSubscriptionQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      const result = await useCase.execute(query);

      expect(result).toBe(false);
    });

    it('should handle leap year edge case (Feb 29 -> Feb 28)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-03-01T00:00:00.000Z')); // After Feb 28, 2025

      const billingCycleAnchor = new Date('2024-02-29T00:00:00.000Z'); // Leap year
      const cancelledAt = new Date('2024-12-15T00:00:00.000Z');
      const subscription = new Subscription({
        orgId: mockOrg.id,
        pricePerSeat: 100,
        noOfSeats: 1,
        renewalCycle: RenewalCycle.YEARLY,
        renewalCycleAnchor: billingCycleAnchor,
        cancelledAt,
      });

      const query = new HasActiveSubscriptionQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      const result = await useCase.execute(query);

      expect(result).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle billing cycle anchor after cancellation date', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-02-10T00:00:00.000Z')); // Before anchor

      const billingCycleAnchor = new Date('2024-02-15T00:00:00.000Z');
      const cancelledAt = new Date('2024-01-20T00:00:00.000Z'); // Cancelled before anchor
      const subscription = new Subscription({
        orgId: mockOrg.id,
        pricePerSeat: 10,
        noOfSeats: 1,
        renewalCycle: RenewalCycle.MONTHLY,
        renewalCycleAnchor: billingCycleAnchor,
        cancelledAt,
      });

      const query = new HasActiveSubscriptionQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      const result = await useCase.execute(query);

      expect(result).toBe(true);
    });

    it('should handle multiple billing cycles passing after cancellation', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-20T00:00:00.000Z')); // Way in the future

      const billingCycleAnchor = new Date('2024-01-15T00:00:00.000Z');
      const cancelledAt = new Date('2024-01-20T00:00:00.000Z');
      const subscription = new Subscription({
        orgId: mockOrg.id,
        pricePerSeat: 10,
        noOfSeats: 1,
        renewalCycle: RenewalCycle.MONTHLY,
        renewalCycleAnchor: billingCycleAnchor,
        cancelledAt,
      });

      const query = new HasActiveSubscriptionQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      const result = await useCase.execute(query);

      expect(result).toBe(false);
    });

    it('should handle repository errors', async () => {
      const query = new HasActiveSubscriptionQuery('org-id' as any);
      const error = new Error('Database connection failed');

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockRejectedValue(error);

      await expect(useCase.execute(query)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle same day cancellation and billing', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-03-15T00:00:00.000Z')); // Next billing date

      const billingCycleAnchor = new Date('2024-01-15T00:00:00.000Z');
      const cancelledAt = new Date('2024-02-15T12:00:00.000Z'); // Cancelled on billing date
      const subscription = new Subscription({
        orgId: mockOrg.id,
        pricePerSeat: 10,
        noOfSeats: 1,
        renewalCycle: RenewalCycle.MONTHLY,
        renewalCycleAnchor: billingCycleAnchor,
        cancelledAt,
      });

      const query = new HasActiveSubscriptionQuery('org-id' as any);

      jest
        .spyOn(mockSubscriptionRepository, 'findByOrgId')
        .mockResolvedValue(subscription);

      const result = await useCase.execute(query);

      expect(result).toBe(false);
    });
  });

  describe('getLastBillingDate method tests', () => {
    it('should calculate correct last billing date for monthly subscription', () => {
      const useCase = new HasActiveSubscriptionUseCase({} as any);
      const cancelledAt = new Date('2024-01-20T00:00:00.000Z');
      const billingCycleAnchor = new Date('2024-01-15T00:00:00.000Z');

      // Access the private method for testing
      const getLastBillingDate = (useCase as any).getLastBillingDate.bind(
        useCase,
      );

      const result = getLastBillingDate(
        cancelledAt,
        RenewalCycle.MONTHLY,
        billingCycleAnchor,
      );

      expect(result).toEqual(new Date('2024-02-15T00:00:00.000Z'));
    });

    it('should calculate correct last billing date for yearly subscription', () => {
      const useCase = new HasActiveSubscriptionUseCase({} as any);
      const cancelledAt = new Date('2024-06-10T00:00:00.000Z');
      const billingCycleAnchor = new Date('2024-01-15T00:00:00.000Z');

      const getLastBillingDate = (useCase as any).getLastBillingDate.bind(
        useCase,
      );

      const result = getLastBillingDate(
        cancelledAt,
        RenewalCycle.YEARLY,
        billingCycleAnchor,
      );

      expect(result).toEqual(new Date('2025-01-15T00:00:00.000Z'));
    });

    it('should return anchor when anchor is after cancellation', () => {
      const useCase = new HasActiveSubscriptionUseCase({} as any);
      const cancelledAt = new Date('2024-01-10T00:00:00.000Z');
      const billingCycleAnchor = new Date('2024-01-15T00:00:00.000Z');

      const getLastBillingDate = (useCase as any).getLastBillingDate.bind(
        useCase,
      );

      const result = getLastBillingDate(
        cancelledAt,
        RenewalCycle.MONTHLY,
        billingCycleAnchor,
      );

      expect(result).toEqual(new Date('2024-01-15T00:00:00.000Z'));
    });
  });
});
