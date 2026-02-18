import { Test, TestingModule } from '@nestjs/testing';
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

  const orgId = 'org-id' as UUID;

  beforeEach(async () => {
    mockUsageRepository = {
      getProviderUsage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetProviderUsageUseCase,
        { provide: UsageRepository, useValue: mockUsageRepository },
      ],
    }).compile();

    useCase = module.get<GetProviderUsageUseCase>(GetProviderUsageUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('successful execution', () => {
    it('should return provider usage data', async () => {
      const mockProviderUsage = [
        new ProviderUsage({
          provider: ModelProvider.OPENAI,
          tokens: 1000,
          requests: 10,
          percentage: 50,
          timeSeriesData: [
            new TimeSeriesPoint({
              date: new Date('2024-01-01'),
              tokens: 500,
              requests: 5,
            }),
            new TimeSeriesPoint({
              date: new Date('2024-01-02'),
              tokens: 500,
              requests: 5,
            }),
          ],
        }),
        new ProviderUsage({
          provider: ModelProvider.ANTHROPIC,
          tokens: 1000,
          requests: 10,
          percentage: 50,
          timeSeriesData: [
            new TimeSeriesPoint({
              date: new Date('2024-01-01'),
              tokens: 500,
              requests: 5,
            }),
            new TimeSeriesPoint({
              date: new Date('2024-01-02'),
              tokens: 500,
              requests: 5,
            }),
          ],
        }),
      ];

      jest
        .spyOn(mockUsageRepository, 'getProviderUsage')
        .mockResolvedValue(mockProviderUsage);

      const query = new GetProviderUsageQuery({ organizationId: orgId });
      const result = await useCase.execute(query);

      expect(result).toHaveLength(2);
      expect(result[0].percentage).toBe(50);
      expect(result[1].percentage).toBe(50);
    });

    it('should calculate percentages correctly', async () => {
      const mockProviderUsage = [
        new ProviderUsage({
          provider: ModelProvider.OPENAI,
          tokens: 600,
          requests: 6,
          percentage: 0,
          timeSeriesData: [],
        }),
        new ProviderUsage({
          provider: ModelProvider.ANTHROPIC,
          tokens: 400,
          requests: 4,
          percentage: 0,
          timeSeriesData: [],
        }),
      ];

      jest
        .spyOn(mockUsageRepository, 'getProviderUsage')
        .mockResolvedValue(mockProviderUsage);

      const query = new GetProviderUsageQuery({ organizationId: orgId });
      const result = await useCase.execute(query);

      expect(result[0].percentage).toBe(60);
      expect(result[1].percentage).toBe(40);
    });

    it('should return empty array when no providers', async () => {
      jest.spyOn(mockUsageRepository, 'getProviderUsage').mockResolvedValue([]);

      const query = new GetProviderUsageQuery({ organizationId: orgId });
      const result = await useCase.execute(query);

      expect(result).toEqual([]);
    });

    it('should handle zero total tokens', async () => {
      const mockProviderUsage = [
        new ProviderUsage({
          provider: ModelProvider.OPENAI,
          tokens: 0,
          requests: 0,
          percentage: 0,
          timeSeriesData: [],
        }),
      ];

      jest
        .spyOn(mockUsageRepository, 'getProviderUsage')
        .mockResolvedValue(mockProviderUsage);

      const query = new GetProviderUsageQuery({ organizationId: orgId });
      const result = await useCase.execute(query);

      expect(result[0].percentage).toBe(0);
    });
  });

  describe('date range validation', () => {
    it('should throw InvalidDateRangeError when start date is after end date', async () => {
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01');
      const query = new GetProviderUsageQuery({
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
      const query = new GetProviderUsageQuery({
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
      const query = new GetProviderUsageQuery({
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
      const query = new GetProviderUsageQuery({
        organizationId: orgId,
        startDate,
        endDate,
      });

      jest.spyOn(mockUsageRepository, 'getProviderUsage').mockResolvedValue([]);

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });

    it('should accept query without date range', async () => {
      const query = new GetProviderUsageQuery({ organizationId: orgId });

      jest.spyOn(mockUsageRepository, 'getProviderUsage').mockResolvedValue([]);

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });
  });

  describe('time series data', () => {
    it('should include time series data when requested', async () => {
      const mockProviderUsage = [
        new ProviderUsage({
          provider: ModelProvider.OPENAI,
          tokens: 1000,
          requests: 10,
          percentage: 100,
          timeSeriesData: [
            new TimeSeriesPoint({
              date: new Date('2024-01-01'),
              tokens: 500,
              requests: 5,
            }),
            new TimeSeriesPoint({
              date: new Date('2024-01-02'),
              tokens: 500,
              requests: 5,
            }),
          ],
        }),
      ];

      jest
        .spyOn(mockUsageRepository, 'getProviderUsage')
        .mockResolvedValue(mockProviderUsage);

      const query = new GetProviderUsageQuery({
        organizationId: orgId,
        includeTimeSeriesData: true,
      });
      const result = await useCase.execute(query);

      expect(result[0].timeSeriesData).toHaveLength(2);
    });
  });
});
