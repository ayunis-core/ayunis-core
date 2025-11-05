import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GetProviderUsageUseCase } from './get-provider-usage.use-case';
import { GetProviderUsageQuery } from './get-provider-usage.query';
import { UsageRepository } from '../../ports/usage.repository';
import { InvalidDateRangeError } from '../../usage.errors';
import { ProviderUsage } from '../../../domain/provider-usage.entity';
import { TimeSeriesPoint } from '../../../domain/time-series-point.entity';
import { ModelProvider } from '../../../../models/domain/value-objects/model-provider.enum';
import { UUID } from 'crypto';

describe('GetProviderUsageUseCase', () => {
  let useCase: GetProviderUsageUseCase;
  let mockUsageRepository: Partial<UsageRepository>;
  let mockConfigService: Partial<ConfigService>;

  const orgId = 'org-id' as UUID;

  beforeEach(async () => {
    mockUsageRepository = {
      getProviderUsage: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetProviderUsageUseCase,
        { provide: UsageRepository, useValue: mockUsageRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    useCase = module.get<GetProviderUsageUseCase>(GetProviderUsageUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('successful execution', () => {
    it('should return provider usage data without cost in cloud mode', async () => {
      const mockProviderUsage = [
        new ProviderUsage(ModelProvider.OPENAI, 1000, 10, 5.0, 50, [
          new TimeSeriesPoint(new Date('2024-01-01'), 500, 5, 2.5),
          new TimeSeriesPoint(new Date('2024-01-02'), 500, 5, 2.5),
        ]),
        new ProviderUsage(ModelProvider.ANTHROPIC, 1000, 10, 6.0, 50, [
          new TimeSeriesPoint(new Date('2024-01-01'), 500, 5, 3.0),
          new TimeSeriesPoint(new Date('2024-01-02'), 500, 5, 3.0),
        ]),
      ];

      jest
        .spyOn(mockUsageRepository, 'getProviderUsage')
        .mockResolvedValue(mockProviderUsage);

      const query = new GetProviderUsageQuery(orgId);
      const result = await useCase.execute(query);

      expect(result).toHaveLength(2);
      expect(result[0].cost).toBeUndefined();
      expect(result[1].cost).toBeUndefined();
      expect(result[0].timeSeriesData[0].cost).toBeUndefined();
      expect(result[0].percentage).toBe(50);
      expect(result[1].percentage).toBe(50);
    });

    it('should return provider usage data with cost in self-hosted mode', async () => {
      jest.spyOn(mockConfigService, 'get').mockReturnValue(true);

      const mockProviderUsage = [
        new ProviderUsage(ModelProvider.OPENAI, 1000, 10, 5.0, 50, [
          new TimeSeriesPoint(new Date('2024-01-01'), 500, 5, 2.5),
          new TimeSeriesPoint(new Date('2024-01-02'), 500, 5, 2.5),
        ]),
        new ProviderUsage(ModelProvider.ANTHROPIC, 1000, 10, 6.0, 50, [
          new TimeSeriesPoint(new Date('2024-01-01'), 500, 5, 3.0),
          new TimeSeriesPoint(new Date('2024-01-02'), 500, 5, 3.0),
        ]),
      ];

      jest
        .spyOn(mockUsageRepository, 'getProviderUsage')
        .mockResolvedValue(mockProviderUsage);

      const query = new GetProviderUsageQuery(orgId);
      const result = await useCase.execute(query);

      expect(result).toHaveLength(2);
      expect(result[0].cost).toBe(5.0);
      expect(result[1].cost).toBe(6.0);
      expect(result[0].timeSeriesData[0].cost).toBe(2.5);
    });

    it('should calculate percentages correctly', async () => {
      const mockProviderUsage = [
        new ProviderUsage(ModelProvider.OPENAI, 600, 6, undefined, 0, []),
        new ProviderUsage(ModelProvider.ANTHROPIC, 400, 4, undefined, 0, []),
      ];

      jest
        .spyOn(mockUsageRepository, 'getProviderUsage')
        .mockResolvedValue(mockProviderUsage);

      const query = new GetProviderUsageQuery(orgId);
      const result = await useCase.execute(query);

      expect(result[0].percentage).toBe(60);
      expect(result[1].percentage).toBe(40);
    });

    it('should return empty array when no providers', async () => {
      jest.spyOn(mockUsageRepository, 'getProviderUsage').mockResolvedValue([]);

      const query = new GetProviderUsageQuery(orgId);
      const result = await useCase.execute(query);

      expect(result).toEqual([]);
    });

    it('should handle zero total tokens', async () => {
      const mockProviderUsage = [
        new ProviderUsage(ModelProvider.OPENAI, 0, 0, undefined, 0, []),
      ];

      jest
        .spyOn(mockUsageRepository, 'getProviderUsage')
        .mockResolvedValue(mockProviderUsage);

      const query = new GetProviderUsageQuery(orgId);
      const result = await useCase.execute(query);

      expect(result[0].percentage).toBe(0);
    });
  });

  describe('date range validation', () => {
    it('should throw InvalidDateRangeError when start date is after end date', async () => {
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01');
      const query = new GetProviderUsageQuery(orgId, startDate, endDate);

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when start date is in the future', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 2);
      const query = new GetProviderUsageQuery(orgId, startDate, endDate);

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when date range exceeds maximum', async () => {
      const startDate = new Date('2022-01-01');
      const endDate = new Date('2024-12-31');
      const query = new GetProviderUsageQuery(orgId, startDate, endDate);

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should accept valid date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const query = new GetProviderUsageQuery(orgId, startDate, endDate);

      jest.spyOn(mockUsageRepository, 'getProviderUsage').mockResolvedValue([]);

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });

    it('should accept query without date range', async () => {
      const query = new GetProviderUsageQuery(orgId);

      jest.spyOn(mockUsageRepository, 'getProviderUsage').mockResolvedValue([]);

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });
  });

  describe('time series data', () => {
    it('should include time series data when requested', async () => {
      const mockProviderUsage = [
        new ProviderUsage(ModelProvider.OPENAI, 1000, 10, undefined, 100, [
          new TimeSeriesPoint(new Date('2024-01-01'), 500, 5),
          new TimeSeriesPoint(new Date('2024-01-02'), 500, 5),
        ]),
      ];

      jest
        .spyOn(mockUsageRepository, 'getProviderUsage')
        .mockResolvedValue(mockProviderUsage);

      const query = new GetProviderUsageQuery(
        orgId,
        undefined,
        undefined,
        true,
      );
      const result = await useCase.execute(query);

      expect(result[0].timeSeriesData).toHaveLength(2);
    });
  });
});
