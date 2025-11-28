import { Test, TestingModule } from '@nestjs/testing';
import { GetUsageStatsUseCase } from './get-usage-stats.use-case';
import { GetUsageStatsQuery } from './get-usage-stats.query';
import { UsageRepository } from '../../ports/usage.repository';
import { InvalidDateRangeError } from '../../usage.errors';
import { UsageStats } from '../../../domain/usage-stats.entity';
import { UUID } from 'crypto';

describe('GetUsageStatsUseCase', () => {
  let useCase: GetUsageStatsUseCase;
  let mockUsageRepository: Partial<UsageRepository>;

  const orgId = 'org-id' as UUID;

  beforeEach(async () => {
    mockUsageRepository = {
      getUsageStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUsageStatsUseCase,
        { provide: UsageRepository, useValue: mockUsageRepository },
      ],
    }).compile();

    useCase = module.get<GetUsageStatsUseCase>(GetUsageStatsUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('successful execution', () => {
    it('should return usage stats with cost', async () => {
      const mockStats = new UsageStats({
        totalTokens: 10000,
        totalRequests: 100,
        totalCost: 50.5,
        currency: 'EUR',
        activeUsers: 10,
        totalUsers: 20,
        topModels: ['Model 1', 'Model 2'],
      });

      jest
        .spyOn(mockUsageRepository, 'getUsageStats')
        .mockResolvedValue(mockStats);

      const query = new GetUsageStatsQuery({ organizationId: orgId });
      const result = await useCase.execute(query);

      expect(result.totalTokens).toBe(10000);
      expect(result.totalRequests).toBe(100);
      expect(result.totalCost).toBe(50.5);
      expect(result.currency).toBe('EUR');
    });

    it('should ensure non-negative values', async () => {
      const mockStats = new UsageStats({
        totalTokens: -100,
        totalRequests: -50,
        totalCost: -10,
        currency: 'EUR',
        activeUsers: -5,
        totalUsers: -10,
        topModels: [],
      });

      jest
        .spyOn(mockUsageRepository, 'getUsageStats')
        .mockResolvedValue(mockStats);

      const query = new GetUsageStatsQuery({ organizationId: orgId });
      const result = await useCase.execute(query);

      expect(result.totalTokens).toBe(0);
      expect(result.totalRequests).toBe(0);
      // Negative cost should be clamped to 0
      expect(result.totalCost).toBe(0);
      expect(result.activeUsers).toBe(0);
      expect(result.totalUsers).toBe(0);
    });

    it('should ensure activeUsers does not exceed totalUsers', async () => {
      const mockStats = new UsageStats({
        totalTokens: 10000,
        totalRequests: 100,
        activeUsers: 25,
        totalUsers: 20, // activeUsers > totalUsers
        topModels: [],
      });

      jest
        .spyOn(mockUsageRepository, 'getUsageStats')
        .mockResolvedValue(mockStats);

      const query = new GetUsageStatsQuery({ organizationId: orgId });
      const result = await useCase.execute(query);

      expect(result.activeUsers).toBe(20);
      expect(result.totalUsers).toBe(20);
    });

    it('should handle zero values correctly', async () => {
      const mockStats = new UsageStats({
        totalTokens: 0,
        totalRequests: 0,
        totalCost: 0,
        activeUsers: 0,
        totalUsers: 0,
        topModels: [],
      });

      jest
        .spyOn(mockUsageRepository, 'getUsageStats')
        .mockResolvedValue(mockStats);

      const query = new GetUsageStatsQuery({ organizationId: orgId });
      const result = await useCase.execute(query);

      expect(result.totalTokens).toBe(0);
      expect(result.totalRequests).toBe(0);
      expect(result.totalCost).toBeUndefined();
      expect(result.activeUsers).toBe(0);
      expect(result.totalUsers).toBe(0);
    });

    it('should hide cost in cloud mode even if cost exists', async () => {
      const mockStats = new UsageStats({
        totalTokens: 10000,
        totalRequests: 100,
        totalCost: 50.5,
        currency: 'EUR',
        activeUsers: 10,
        totalUsers: 20,
        topModels: [],
      });

      jest
        .spyOn(mockUsageRepository, 'getUsageStats')
        .mockResolvedValue(mockStats);

      const query = new GetUsageStatsQuery({ organizationId: orgId });
      const result = await useCase.execute(query);

      expect(result.totalCost).toBeUndefined();
    });
  });

  describe('date range validation', () => {
    it('should throw InvalidDateRangeError when start date is after end date', async () => {
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01');
      const query = new GetUsageStatsQuery({
        organizationId: orgId,
        startDate,
        endDate,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when start date is in the future', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 2);
      const query = new GetUsageStatsQuery({
        organizationId: orgId,
        startDate,
        endDate,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when date range exceeds maximum', async () => {
      const startDate = new Date('2022-01-01');
      const endDate = new Date('2024-12-31');
      const query = new GetUsageStatsQuery({
        organizationId: orgId,
        startDate,
        endDate,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should accept valid date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const query = new GetUsageStatsQuery({
        organizationId: orgId,
        startDate,
        endDate,
      });

      const mockStats = new UsageStats({
        totalTokens: 0,
        totalRequests: 0,
        activeUsers: 0,
        totalUsers: 0,
        topModels: [],
      });
      jest
        .spyOn(mockUsageRepository, 'getUsageStats')
        .mockResolvedValue(mockStats);

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });

    it('should accept query without date range', async () => {
      const query = new GetUsageStatsQuery({ organizationId: orgId });

      const mockStats = new UsageStats({
        totalTokens: 0,
        totalRequests: 0,
        activeUsers: 0,
        totalUsers: 0,
        topModels: [],
      });
      jest
        .spyOn(mockUsageRepository, 'getUsageStats')
        .mockResolvedValue(mockStats);

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });
  });
});
