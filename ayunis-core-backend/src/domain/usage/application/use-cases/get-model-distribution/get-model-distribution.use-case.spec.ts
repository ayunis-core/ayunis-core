import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
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
  let mockConfigService: Partial<ConfigService>;

  const orgId = 'org-id' as UUID;

  beforeEach(async () => {
    mockUsageRepository = {
      getModelDistribution: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetModelDistributionUseCase,
        { provide: UsageRepository, useValue: mockUsageRepository },
        { provide: ConfigService, useValue: mockConfigService },
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
    it('should return model distribution without cost in cloud mode', async () => {
      const mockModelDistribution = [
        new ModelDistribution(
          'model-1' as UUID,
          'model-1',
          'Model 1',
          ModelProvider.OPENAI,
          1000,
          10,
          5.0,
          50,
        ),
        new ModelDistribution(
          'model-2' as UUID,
          'model-2',
          'Model 2',
          ModelProvider.ANTHROPIC,
          1000,
          10,
          6.0,
          50,
        ),
      ];

      jest
        .spyOn(mockUsageRepository, 'getModelDistribution')
        .mockResolvedValue(mockModelDistribution);

      const query = new GetModelDistributionQuery(orgId);
      const result = await useCase.execute(query);

      expect(result).toHaveLength(2);
      expect(result[0].cost).toBeUndefined();
      expect(result[1].cost).toBeUndefined();
      expect(result[0].percentage).toBe(50);
      expect(result[1].percentage).toBe(50);
    });

    it('should return model distribution with cost in self-hosted mode', async () => {
      jest.spyOn(mockConfigService, 'get').mockReturnValue(true);

      const mockModelDistribution = [
        new ModelDistribution(
          'model-1' as UUID,
          'model-1',
          'Model 1',
          ModelProvider.OPENAI,
          1000,
          10,
          5.0,
          50,
        ),
        new ModelDistribution(
          'model-2' as UUID,
          'model-2',
          'Model 2',
          ModelProvider.ANTHROPIC,
          1000,
          10,
          6.0,
          50,
        ),
      ];

      jest
        .spyOn(mockUsageRepository, 'getModelDistribution')
        .mockResolvedValue(mockModelDistribution);

      const query = new GetModelDistributionQuery(orgId);
      const result = await useCase.execute(query);

      expect(result).toHaveLength(2);
      expect(result[0].cost).toBe(5.0);
      expect(result[1].cost).toBe(6.0);
    });

    it('should sort models by token usage descending', async () => {
      const mockModelDistribution = [
        new ModelDistribution(
          'model-1' as UUID,
          'model-1',
          'Model 1',
          ModelProvider.OPENAI,
          400,
          4,
          undefined,
          0,
        ),
        new ModelDistribution(
          'model-2' as UUID,
          'model-2',
          'Model 2',
          ModelProvider.ANTHROPIC,
          600,
          6,
          undefined,
          0,
        ),
      ];

      jest
        .spyOn(mockUsageRepository, 'getModelDistribution')
        .mockResolvedValue(mockModelDistribution);

      const query = new GetModelDistributionQuery(orgId);
      const result = await useCase.execute(query);

      expect(result[0].tokens).toBe(600);
      expect(result[1].tokens).toBe(400);
    });

    it('should group models beyond maxModels into Others', async () => {
      const mockModelDistribution = [
        new ModelDistribution(
          'model-1' as UUID,
          'model-1',
          'Model 1',
          ModelProvider.OPENAI,
          300,
          3,
          undefined,
          0,
        ),
        new ModelDistribution(
          'model-2' as UUID,
          'model-2',
          'Model 2',
          ModelProvider.ANTHROPIC,
          250,
          2,
          undefined,
          0,
        ),
        new ModelDistribution(
          'model-3' as UUID,
          'model-3',
          'Model 3',
          ModelProvider.OPENAI,
          200,
          2,
          undefined,
          0,
        ),
        new ModelDistribution(
          'model-4' as UUID,
          'model-4',
          'Model 4',
          ModelProvider.ANTHROPIC,
          150,
          1,
          undefined,
          0,
        ),
        new ModelDistribution(
          'model-5' as UUID,
          'model-5',
          'Model 5',
          ModelProvider.OPENAI,
          100,
          1,
          undefined,
          0,
        ),
      ];

      jest
        .spyOn(mockUsageRepository, 'getModelDistribution')
        .mockResolvedValue(mockModelDistribution);

      const query = new GetModelDistributionQuery(
        orgId,
        undefined,
        undefined,
        3,
      );
      const result = await useCase.execute(query);

      expect(result).toHaveLength(3);
      expect(result[2].modelId).toBe(UsageConstants.OTHERS_MODEL_ID);
      expect(result[2].tokens).toBe(450); // 200 + 150 + 100
      expect(result[2].requests).toBe(4); // 2 + 1 + 1
    });

    it('should return empty array when no models', async () => {
      jest
        .spyOn(mockUsageRepository, 'getModelDistribution')
        .mockResolvedValue([]);

      const query = new GetModelDistributionQuery(orgId);
      const result = await useCase.execute(query);

      expect(result).toEqual([]);
    });

    it('should return all models when count is less than maxModels', async () => {
      const mockModelDistribution = [
        new ModelDistribution(
          'model-1' as UUID,
          'model-1',
          'Model 1',
          ModelProvider.OPENAI,
          500,
          5,
          undefined,
          0,
        ),
        new ModelDistribution(
          'model-2' as UUID,
          'model-2',
          'Model 2',
          ModelProvider.ANTHROPIC,
          500,
          5,
          undefined,
          0,
        ),
      ];

      jest
        .spyOn(mockUsageRepository, 'getModelDistribution')
        .mockResolvedValue(mockModelDistribution);

      const query = new GetModelDistributionQuery(
        orgId,
        undefined,
        undefined,
        10,
      );
      const result = await useCase.execute(query);

      expect(result).toHaveLength(2);
      expect(
        result.every((m) => m.modelId !== UsageConstants.OTHERS_MODEL_ID),
      ).toBe(true);
    });
  });

  describe('date range validation', () => {
    it('should throw InvalidDateRangeError when start date is after end date', async () => {
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01');
      const query = new GetModelDistributionQuery(orgId, startDate, endDate);

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when start date is in the future', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 2);
      const query = new GetModelDistributionQuery(orgId, startDate, endDate);

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when date range exceeds maximum', async () => {
      const startDate = new Date('2022-01-01');
      const endDate = new Date('2024-12-31');
      const query = new GetModelDistributionQuery(orgId, startDate, endDate);

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should accept valid date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const query = new GetModelDistributionQuery(orgId, startDate, endDate);

      jest
        .spyOn(mockUsageRepository, 'getModelDistribution')
        .mockResolvedValue([]);

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });
  });

  describe('maxModels validation', () => {
    it('should throw InvalidDateRangeError when maxModels is zero', async () => {
      const query = new GetModelDistributionQuery(
        orgId,
        undefined,
        undefined,
        0,
      );

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when maxModels is negative', async () => {
      const query = new GetModelDistributionQuery(
        orgId,
        undefined,
        undefined,
        -1,
      );

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should accept valid maxModels', async () => {
      const query = new GetModelDistributionQuery(
        orgId,
        undefined,
        undefined,
        5,
      );

      jest
        .spyOn(mockUsageRepository, 'getModelDistribution')
        .mockResolvedValue([]);

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });
  });
});
