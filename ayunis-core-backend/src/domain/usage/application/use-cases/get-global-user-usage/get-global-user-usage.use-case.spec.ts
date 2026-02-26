import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetGlobalUserUsageUseCase } from './get-global-user-usage.use-case';
import { GetGlobalUserUsageQuery } from './get-global-user-usage.query';
import { UsageRepository } from '../../ports/usage.repository';
import { InvalidDateRangeError } from '../../usage.errors';
import { GlobalUserUsageItem } from '../../../domain/global-user-usage-item.entity';
import type { UUID } from 'crypto';

describe('GetGlobalUserUsageUseCase', () => {
  let useCase: GetGlobalUserUsageUseCase;
  let mockUsageRepository: Partial<UsageRepository>;

  beforeAll(async () => {
    mockUsageRepository = {
      getGlobalUserUsage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetGlobalUserUsageUseCase,
        { provide: UsageRepository, useValue: mockUsageRepository },
      ],
    }).compile();

    useCase = module.get<GetGlobalUserUsageUseCase>(GetGlobalUserUsageUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('successful execution', () => {
    it('should return global user usage data from repository', async () => {
      const userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' as UUID;
      const mockItems = [
        new GlobalUserUsageItem({
          userId,
          userName: 'Alice Müller',
          userEmail: 'alice@stadt-koeln.de',
          tokens: 15000,
          requests: 42,
          lastActivity: new Date(),
          isActive: true,
          organizationName: 'Stadt Köln',
        }),
      ];

      jest
        .spyOn(mockUsageRepository, 'getGlobalUserUsage')
        .mockResolvedValue(mockItems);

      const query = new GetGlobalUserUsageQuery({});
      const result = await useCase.execute(query);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(userId);
      expect(result[0].organizationName).toBe('Stadt Köln');
    });

    it('should pass date filters to repository', async () => {
      jest
        .spyOn(mockUsageRepository, 'getGlobalUserUsage')
        .mockResolvedValue([]);

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const query = new GetGlobalUserUsageQuery({ startDate, endDate });

      await useCase.execute(query);

      expect(mockUsageRepository.getGlobalUserUsage).toHaveBeenCalledWith(
        query,
      );
    });

    it('should return empty array when no usage data exists', async () => {
      jest
        .spyOn(mockUsageRepository, 'getGlobalUserUsage')
        .mockResolvedValue([]);

      const query = new GetGlobalUserUsageQuery({});
      const result = await useCase.execute(query);

      expect(result).toEqual([]);
    });
  });

  describe('date range validation', () => {
    it('should throw InvalidDateRangeError when start date is after end date', async () => {
      const query = new GetGlobalUserUsageQuery({
        startDate: new Date('2025-01-31'),
        endDate: new Date('2025-01-01'),
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when start date is in the future', async () => {
      const futureStart = new Date();
      futureStart.setDate(futureStart.getDate() + 1);
      const futureEnd = new Date();
      futureEnd.setDate(futureEnd.getDate() + 2);

      const query = new GetGlobalUserUsageQuery({
        startDate: futureStart,
        endDate: futureEnd,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when date range exceeds 730 days', async () => {
      const query = new GetGlobalUserUsageQuery({
        startDate: new Date('2022-01-01'),
        endDate: new Date('2024-12-31'),
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should accept valid date range', async () => {
      jest
        .spyOn(mockUsageRepository, 'getGlobalUserUsage')
        .mockResolvedValue([]);

      const query = new GetGlobalUserUsageQuery({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      });

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });

    it('should accept query without date range', async () => {
      jest
        .spyOn(mockUsageRepository, 'getGlobalUserUsage')
        .mockResolvedValue([]);

      const query = new GetGlobalUserUsageQuery({});

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });

    it('should throw InvalidDateRangeError when only startDate is provided', async () => {
      const query = new GetGlobalUserUsageQuery({
        startDate: new Date('2025-06-01'),
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when only endDate is provided', async () => {
      const query = new GetGlobalUserUsageQuery({
        endDate: new Date('2025-06-30'),
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });
  });
});
