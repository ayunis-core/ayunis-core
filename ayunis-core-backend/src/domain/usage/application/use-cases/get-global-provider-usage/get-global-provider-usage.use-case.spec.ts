import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetGlobalProviderUsageUseCase } from './get-global-provider-usage.use-case';
import { GetGlobalProviderUsageQuery } from './get-global-provider-usage.query';
import { UsageRepository } from '../../ports/usage.repository';
import { InvalidDateRangeError } from '../../usage.errors';
import { ProviderUsage } from '../../../domain/provider-usage.entity';
import { ModelProvider } from '../../../../models/domain/value-objects/model-provider.enum';

describe('GetGlobalProviderUsageUseCase', () => {
  let useCase: GetGlobalProviderUsageUseCase;
  let mockUsageRepository: Partial<UsageRepository>;

  beforeAll(async () => {
    mockUsageRepository = {
      getGlobalProviderUsage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetGlobalProviderUsageUseCase,
        { provide: UsageRepository, useValue: mockUsageRepository },
      ],
    }).compile();

    useCase = module.get<GetGlobalProviderUsageUseCase>(
      GetGlobalProviderUsageUseCase,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('successful execution', () => {
    it('should return provider usage with recalculated percentages', async () => {
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
        .spyOn(mockUsageRepository, 'getGlobalProviderUsage')
        .mockResolvedValue(mockProviderUsage);

      const query = new GetGlobalProviderUsageQuery({});
      const result = await useCase.execute(query);

      expect(result).toHaveLength(2);
      expect(result[0].percentage).toBe(60);
      expect(result[1].percentage).toBe(40);
    });

    it('should return empty array when no providers', async () => {
      jest
        .spyOn(mockUsageRepository, 'getGlobalProviderUsage')
        .mockResolvedValue([]);

      const query = new GetGlobalProviderUsageQuery({});
      const result = await useCase.execute(query);

      expect(result).toEqual([]);
    });
  });

  describe('date range validation', () => {
    it('should throw InvalidDateRangeError when only startDate is provided', async () => {
      const query = new GetGlobalProviderUsageQuery({
        startDate: new Date('2024-01-01'),
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when only endDate is provided', async () => {
      const query = new GetGlobalProviderUsageQuery({
        endDate: new Date('2024-01-31'),
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when start date is after end date', async () => {
      const query = new GetGlobalProviderUsageQuery({
        startDate: new Date('2024-01-31'),
        endDate: new Date('2024-01-01'),
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should accept valid date range', async () => {
      jest
        .spyOn(mockUsageRepository, 'getGlobalProviderUsage')
        .mockResolvedValue([]);

      const query = new GetGlobalProviderUsageQuery({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });

    it('should accept query without date range', async () => {
      jest
        .spyOn(mockUsageRepository, 'getGlobalProviderUsage')
        .mockResolvedValue([]);

      const query = new GetGlobalProviderUsageQuery({});

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });
  });
});
