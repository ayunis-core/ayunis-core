import { Test, TestingModule } from '@nestjs/testing';
import { GetModelDistributionUseCase } from './get-model-distribution.use-case';
import { GetModelDistributionQuery } from './get-model-distribution.query';
import { UsageRepository } from '../../ports/usage.repository';
import { InvalidDateRangeError } from '../../usage.errors';
import { ModelDistribution } from '../../../domain/model-distribution.entity';
import { ModelProvider } from '../../../../models/domain/value-objects/model-provider.enum';
import { UsageConstants } from '../../../domain/value-objects/usage.constants';
import { UUID } from 'crypto';

describe('GetModelDistributionUseCase', () => {
  let useCase: GetModelDistributionUseCase;
  let mockUsageRepository: Partial<UsageRepository>;

  const orgId = 'org-id' as UUID;

  beforeEach(async () => {
    mockUsageRepository = {
      getModelDistribution: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetModelDistributionUseCase,
        { provide: UsageRepository, useValue: mockUsageRepository },
      ],
    }).compile();

    useCase = module.get<GetModelDistributionUseCase>(
      GetModelDistributionUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('successful execution', () => {
    it('should return model distribution with cost', async () => {
      const mockModelDistribution = [
        new ModelDistribution({
          modelId: 'model-1' as UUID,
          modelName: 'model-1',
          displayName: 'Model 1',
          provider: ModelProvider.OPENAI,
          tokens: 1000,
          requests: 10,
          cost: 5.0,
          percentage: 50,
        }),
        new ModelDistribution({
          modelId: 'model-2' as UUID,
          modelName: 'model-2',
          displayName: 'Model 2',
          provider: ModelProvider.ANTHROPIC,
          tokens: 1000,
          requests: 10,
          cost: 6.0,
          percentage: 50,
        }),
      ];

      jest
        .spyOn(mockUsageRepository, 'getModelDistribution')
        .mockResolvedValue(mockModelDistribution);

      const query = new GetModelDistributionQuery({ organizationId: orgId });
      const result = await useCase.execute(query);

      expect(result).toHaveLength(2);
      expect(result[0].cost).toBe(5.0);
      expect(result[1].cost).toBe(6.0);
      expect(result[0].percentage).toBe(50);
      expect(result[1].percentage).toBe(50);
    });

    it('should sort models by token usage descending', async () => {
      const mockModelDistribution = [
        new ModelDistribution({
          modelId: 'model-1' as UUID,
          modelName: 'model-1',
          displayName: 'Model 1',
          provider: ModelProvider.OPENAI,
          tokens: 400,
          requests: 4,
          percentage: 0,
        }),
        new ModelDistribution({
          modelId: 'model-2' as UUID,
          modelName: 'model-2',
          displayName: 'Model 2',
          provider: ModelProvider.ANTHROPIC,
          tokens: 600,
          requests: 6,
          percentage: 0,
        }),
      ];

      jest
        .spyOn(mockUsageRepository, 'getModelDistribution')
        .mockResolvedValue(mockModelDistribution);

      const query = new GetModelDistributionQuery({ organizationId: orgId });
      const result = await useCase.execute(query);

      expect(result[0].tokens).toBe(600);
      expect(result[1].tokens).toBe(400);
    });

    it('should limit models to maxModels when specified', async () => {
      const mockModelDistribution = [
        new ModelDistribution({
          modelId: 'model-1' as UUID,
          modelName: 'model-1',
          displayName: 'Model 1',
          provider: ModelProvider.OPENAI,
          tokens: 300,
          requests: 3,
          percentage: 0,
        }),
        new ModelDistribution({
          modelId: 'model-2' as UUID,
          modelName: 'model-2',
          displayName: 'Model 2',
          provider: ModelProvider.ANTHROPIC,
          tokens: 250,
          requests: 2,
          percentage: 0,
        }),
        new ModelDistribution({
          modelId: 'model-3' as UUID,
          modelName: 'model-3',
          displayName: 'Model 3',
          provider: ModelProvider.OPENAI,
          tokens: 200,
          requests: 2,
          percentage: 0,
        }),
        new ModelDistribution({
          modelId: 'model-4' as UUID,
          modelName: 'model-4',
          displayName: 'Model 4',
          provider: ModelProvider.ANTHROPIC,
          tokens: 150,
          requests: 1,
          percentage: 0,
        }),
        new ModelDistribution({
          modelId: 'model-5' as UUID,
          modelName: 'model-5',
          displayName: 'Model 5',
          provider: ModelProvider.OPENAI,
          tokens: 100,
          requests: 1,
          percentage: 0,
        }),
      ];

      jest
        .spyOn(mockUsageRepository, 'getModelDistribution')
        .mockResolvedValue(mockModelDistribution);

      const query = new GetModelDistributionQuery({
        organizationId: orgId,
        maxModels: 3,
      });
      const result = await useCase.execute(query);

      expect(result).toHaveLength(3);
      expect(result[0].modelId).toBe('model-1');
      expect(result[1].modelId).toBe('model-2');
      expect(result[2].modelId).toBe('model-3');
    });

    it('should return empty array when no models', async () => {
      jest
        .spyOn(mockUsageRepository, 'getModelDistribution')
        .mockResolvedValue([]);

      const query = new GetModelDistributionQuery({ organizationId: orgId });
      const result = await useCase.execute(query);

      expect(result).toEqual([]);
    });

    it('should return all models when count is less than maxModels', async () => {
      const mockModelDistribution = [
        new ModelDistribution({
          modelId: 'model-1' as UUID,
          modelName: 'model-1',
          displayName: 'Model 1',
          provider: ModelProvider.OPENAI,
          tokens: 500,
          requests: 5,
          percentage: 0,
        }),
        new ModelDistribution({
          modelId: 'model-2' as UUID,
          modelName: 'model-2',
          displayName: 'Model 2',
          provider: ModelProvider.ANTHROPIC,
          tokens: 500,
          requests: 5,
          percentage: 0,
        }),
      ];

      jest
        .spyOn(mockUsageRepository, 'getModelDistribution')
        .mockResolvedValue(mockModelDistribution);

      const query = new GetModelDistributionQuery({
        organizationId: orgId,
        maxModels: 10,
      });
      const result = await useCase.execute(query);

      expect(result).toHaveLength(2);
    });
  });

  describe('date range validation', () => {
    it('should throw InvalidDateRangeError when start date is after end date', async () => {
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01');
      const query = new GetModelDistributionQuery({
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
      const query = new GetModelDistributionQuery({
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
      const query = new GetModelDistributionQuery({
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
      const query = new GetModelDistributionQuery({
        organizationId: orgId,
        startDate,
        endDate,
      });

      jest
        .spyOn(mockUsageRepository, 'getModelDistribution')
        .mockResolvedValue([]);

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });
  });

  describe('maxModels validation', () => {
    it('should throw InvalidDateRangeError when maxModels is zero', async () => {
      const query = new GetModelDistributionQuery({
        organizationId: orgId,
        maxModels: 0,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when maxModels is negative', async () => {
      const query = new GetModelDistributionQuery({
        organizationId: orgId,
        maxModels: -1,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should accept valid maxModels', async () => {
      const query = new GetModelDistributionQuery({
        organizationId: orgId,
        maxModels: 5,
      });

      jest
        .spyOn(mockUsageRepository, 'getModelDistribution')
        .mockResolvedValue([]);

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });
  });
});
