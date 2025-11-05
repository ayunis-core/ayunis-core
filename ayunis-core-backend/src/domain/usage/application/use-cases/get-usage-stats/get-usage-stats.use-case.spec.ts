import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GetUsageStatsUseCase } from './get-usage-stats.use-case';
import { GetUsageStatsQuery } from './get-usage-stats.query';
import { UsageRepository } from '../../ports/usage.repository';
import { InvalidDateRangeError } from '../../usage.errors';
import { UsageStats } from '../../../domain/usage-stats.entity';
import { UUID } from 'crypto';

describe('GetUsageStatsUseCase', () => {
  let useCase: GetUsageStatsUseCase;
  let mockUsageRepository: Partial<UsageRepository>;
  let mockConfigService: Partial<ConfigService>;

  const orgId = 'org-id' as UUID;

  beforeEach(async () => {
    mockUsageRepository = {
      getUsageStats: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUsageStatsUseCase,
        { provide: UsageRepository, useValue: mockUsageRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    useCase = module.get<GetUsageStatsUseCase>(GetUsageStatsUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('successful execution', () => {
    it('should return usage stats without cost in cloud mode', async () => {
      const mockStats = new UsageStats(
        10000,
        100,
        undefined,
        undefined,
        10,
        20,
        ['Model 1', 'Model 2'],
      );

      jest
        .spyOn(mockUsageRepository, 'getUsageStats')
        .mockResolvedValue(mockStats);

      const query = new GetUsageStatsQuery(orgId);
      const result = await useCase.execute(query);

      expect(result.totalTokens).toBe(10000);
      expect(result.totalRequests).toBe(100);
      expect(result.totalCost).toBeUndefined();
      expect(result.activeUsers).toBe(10);
      expect(result.totalUsers).toBe(20);
      expect(result.topModels).toEqual(['Model 1', 'Model 2']);
    });

    it('should return usage stats with cost in self-hosted mode', async () => {
      jest.spyOn(mockConfigService, 'get').mockReturnValue(true);

      const mockStats = new UsageStats(10000, 100, 50.5, 'EUR', 10, 20, [
        'Model 1',
        'Model 2',
      ]);

      jest
        .spyOn(mockUsageRepository, 'getUsageStats')
        .mockResolvedValue(mockStats);

      const query = new GetUsageStatsQuery(orgId);
      const result = await useCase.execute(query);

      expect(result.totalTokens).toBe(10000);
      expect(result.totalRequests).toBe(100);
      expect(result.totalCost).toBe(50.5);
      expect(result.currency).toBe('EUR');
    });

    it('should ensure non-negative values', async () => {
      const mockStats = new UsageStats(-100, -50, -10, 'EUR', -5, -10, []);

      jest
        .spyOn(mockUsageRepository, 'getUsageStats')
        .mockResolvedValue(mockStats);

      const query = new GetUsageStatsQuery(orgId);
      const result = await useCase.execute(query);

      expect(result.totalTokens).toBe(0);
      expect(result.totalRequests).toBe(0);
      // In cloud mode, cost should be undefined even if negative
      expect(result.totalCost).toBeUndefined();
      expect(result.activeUsers).toBe(0);
      expect(result.totalUsers).toBe(0);
    });

    it('should ensure activeUsers does not exceed totalUsers', async () => {
      const mockStats = new UsageStats(
        10000,
        100,
        undefined,
        undefined,
        25,
        20, // activeUsers > totalUsers
        [],
      );

      jest
        .spyOn(mockUsageRepository, 'getUsageStats')
        .mockResolvedValue(mockStats);

      const query = new GetUsageStatsQuery(orgId);
      const result = await useCase.execute(query);

      expect(result.activeUsers).toBe(20);
      expect(result.totalUsers).toBe(20);
    });

    it('should handle zero values correctly', async () => {
      const mockStats = new UsageStats(0, 0, 0, undefined, 0, 0, []);

      jest
        .spyOn(mockUsageRepository, 'getUsageStats')
        .mockResolvedValue(mockStats);

      const query = new GetUsageStatsQuery(orgId);
      const result = await useCase.execute(query);

      expect(result.totalTokens).toBe(0);
      expect(result.totalRequests).toBe(0);
      expect(result.totalCost).toBeUndefined();
      expect(result.activeUsers).toBe(0);
      expect(result.totalUsers).toBe(0);
    });

    it('should hide cost in cloud mode even if cost exists', async () => {
      const mockStats = new UsageStats(10000, 100, 50.5, 'EUR', 10, 20, []);

      jest
        .spyOn(mockUsageRepository, 'getUsageStats')
        .mockResolvedValue(mockStats);

      const query = new GetUsageStatsQuery(orgId);
      const result = await useCase.execute(query);

      expect(result.totalCost).toBeUndefined();
    });
  });

  describe('date range validation', () => {
    it('should throw InvalidDateRangeError when start date is after end date', async () => {
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01');
      const query = new GetUsageStatsQuery(orgId, startDate, endDate);

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when start date is in the future', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 2);
      const query = new GetUsageStatsQuery(orgId, startDate, endDate);

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when date range exceeds maximum', async () => {
      const startDate = new Date('2022-01-01');
      const endDate = new Date('2024-12-31');
      const query = new GetUsageStatsQuery(orgId, startDate, endDate);

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should accept valid date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const query = new GetUsageStatsQuery(orgId, startDate, endDate);

      const mockStats = new UsageStats(0, 0, undefined, undefined, 0, 0, []);
      jest
        .spyOn(mockUsageRepository, 'getUsageStats')
        .mockResolvedValue(mockStats);

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });

    it('should accept query without date range', async () => {
      const query = new GetUsageStatsQuery(orgId);

      const mockStats = new UsageStats(0, 0, undefined, undefined, 0, 0, []);
      jest
        .spyOn(mockUsageRepository, 'getUsageStats')
        .mockResolvedValue(mockStats);

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });
  });
});
