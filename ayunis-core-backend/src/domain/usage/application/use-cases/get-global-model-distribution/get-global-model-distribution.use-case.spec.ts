import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetGlobalModelDistributionUseCase } from './get-global-model-distribution.use-case';
import { GetGlobalModelDistributionQuery } from './get-global-model-distribution.query';
import { UsageRepository } from '../../ports/usage.repository';
import { InvalidDateRangeError } from '../../usage.errors';
import { ModelDistribution } from '../../../domain/model-distribution.entity';
import { ModelProvider } from '../../../../models/domain/value-objects/model-provider.enum';
import type { UUID } from 'crypto';

describe('GetGlobalModelDistributionUseCase', () => {
  let useCase: GetGlobalModelDistributionUseCase;
  let mockUsageRepository: Partial<UsageRepository>;

  beforeAll(async () => {
    mockUsageRepository = {
      getGlobalModelDistribution: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetGlobalModelDistributionUseCase,
        { provide: UsageRepository, useValue: mockUsageRepository },
      ],
    }).compile();

    useCase = module.get<GetGlobalModelDistributionUseCase>(
      GetGlobalModelDistributionUseCase,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('successful execution', () => {
    it('should return model distribution with recalculated percentages', async () => {
      const mockModels = [
        new ModelDistribution({
          modelId: 'model-1' as UUID,
          modelName: 'gpt-4',
          displayName: 'GPT-4',
          provider: ModelProvider.OPENAI,
          tokens: 600,
          requests: 6,
          percentage: 0,
        }),
        new ModelDistribution({
          modelId: 'model-2' as UUID,
          modelName: 'claude-3',
          displayName: 'Claude 3',
          provider: ModelProvider.ANTHROPIC,
          tokens: 400,
          requests: 4,
          percentage: 0,
        }),
      ];

      jest
        .spyOn(mockUsageRepository, 'getGlobalModelDistribution')
        .mockResolvedValue(mockModels);

      const query = new GetGlobalModelDistributionQuery({});
      const result = await useCase.execute(query);

      expect(result).toHaveLength(2);
      expect(result[0].percentage).toBe(60);
      expect(result[1].percentage).toBe(40);
    });

    it('should return empty array when no models', async () => {
      jest
        .spyOn(mockUsageRepository, 'getGlobalModelDistribution')
        .mockResolvedValue([]);

      const query = new GetGlobalModelDistributionQuery({});
      const result = await useCase.execute(query);

      expect(result).toEqual([]);
    });
  });

  describe('date range validation', () => {
    it('should throw InvalidDateRangeError when only startDate is provided', async () => {
      const query = new GetGlobalModelDistributionQuery({
        startDate: new Date('2024-01-01'),
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when only endDate is provided', async () => {
      const query = new GetGlobalModelDistributionQuery({
        endDate: new Date('2024-01-31'),
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when start date is after end date', async () => {
      const query = new GetGlobalModelDistributionQuery({
        startDate: new Date('2024-01-31'),
        endDate: new Date('2024-01-01'),
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should accept valid date range', async () => {
      jest
        .spyOn(mockUsageRepository, 'getGlobalModelDistribution')
        .mockResolvedValue([]);

      const query = new GetGlobalModelDistributionQuery({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });

    it('should accept query without date range', async () => {
      jest
        .spyOn(mockUsageRepository, 'getGlobalModelDistribution')
        .mockResolvedValue([]);

      const query = new GetGlobalModelDistributionQuery({});

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });
  });

  describe('maxModels validation', () => {
    it('should throw InvalidDateRangeError when maxModels is zero', async () => {
      const query = new GetGlobalModelDistributionQuery({
        maxModels: 0,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when maxModels is negative', async () => {
      const query = new GetGlobalModelDistributionQuery({
        maxModels: -1,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });
  });
});
