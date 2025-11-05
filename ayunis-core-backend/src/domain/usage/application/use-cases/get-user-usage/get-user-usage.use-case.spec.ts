import { Test, TestingModule } from '@nestjs/testing';
import { GetUserUsageUseCase } from './get-user-usage.use-case';
import { GetUserUsageQuery } from './get-user-usage.query';
import { UsageRepository } from '../../ports/usage.repository';
import {
  InvalidDateRangeError,
  InvalidPaginationError,
} from '../../usage.errors';
import { Paginated } from 'src/common/pagination';
import { UserUsageItem } from '../../../domain/user-usage-item.entity';
import { ModelBreakdownItem } from '../../../domain/model-breakdown-item.entity';
import { UUID } from 'crypto';
import { ModelProvider } from '../../../../models/domain/value-objects/model-provider.enum';
import { UsageConstants } from '../../../domain/value-objects/usage.constants';

describe('GetUserUsageUseCase', () => {
  let useCase: GetUserUsageUseCase;
  let mockUsageRepository: Partial<UsageRepository>;

  const orgId = 'org-id' as UUID;

  beforeEach(async () => {
    mockUsageRepository = {
      getUserUsage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserUsageUseCase,
        { provide: UsageRepository, useValue: mockUsageRepository },
      ],
    }).compile();

    useCase = module.get<GetUserUsageUseCase>(GetUserUsageUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('successful execution', () => {
    it('should return user usage data', async () => {
      const userId = 'user-id' as UUID;
      const modelBreakdown = [
        new ModelBreakdownItem(
          'model-id' as UUID,
          'model-name',
          'Model Name',
          ModelProvider.OPENAI,
          100,
          5,
          undefined,
          undefined,
        ),
      ];

      const mockUserUsage = new Paginated<UserUsageItem>({
        data: [
          new UserUsageItem(
            userId,
            'Test User',
            'test@example.com',
            100,
            5,
            undefined,
            new Date(),
            true,
            modelBreakdown,
          ),
        ],
        limit: 50,
        offset: 0,
        total: 1,
      });

      jest
        .spyOn(mockUsageRepository, 'getUserUsage')
        .mockResolvedValue(mockUserUsage);

      const query = new GetUserUsageQuery(orgId);

      const result = await useCase.execute(query);

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].userId).toBe(userId);
      expect(result.data[0].isActive).toBe(true);
    });

    it('should calculate model breakdown percentages correctly', async () => {
      const userId = 'user-id' as UUID;
      const modelBreakdown = [
        new ModelBreakdownItem(
          'model-id-1' as UUID,
          'model-1',
          'Model 1',
          ModelProvider.OPENAI,
          60,
          3,
          undefined,
          undefined,
        ),
        new ModelBreakdownItem(
          'model-id-2' as UUID,
          'model-2',
          'Model 2',
          ModelProvider.ANTHROPIC,
          40,
          2,
          undefined,
          undefined,
        ),
      ];

      const mockUserUsage = new Paginated<UserUsageItem>({
        data: [
          new UserUsageItem(
            userId,
            'Test User',
            'test@example.com',
            100, // Total tokens
            5,
            undefined,
            new Date(),
            true,
            modelBreakdown,
          ),
        ],
        limit: 50,
        offset: 0,
        total: 1,
      });

      jest
        .spyOn(mockUsageRepository, 'getUserUsage')
        .mockResolvedValue(mockUserUsage);

      const query = new GetUserUsageQuery(orgId);
      const result = await useCase.execute(query);

      expect(result.data[0].modelBreakdown[0].percentage).toBe(60);
      expect(result.data[0].modelBreakdown[1].percentage).toBe(40);
    });

    it('should mark users as inactive if lastActivity is null', async () => {
      const userId = 'user-id' as UUID;
      const mockUserUsage = new Paginated<UserUsageItem>({
        data: [
          new UserUsageItem(
            userId,
            'Test User',
            'test@example.com',
            0,
            0,
            undefined,
            null, // No activity
            false,
            [],
          ),
        ],
        limit: 50,
        offset: 0,
        total: 1,
      });

      jest
        .spyOn(mockUsageRepository, 'getUserUsage')
        .mockResolvedValue(mockUserUsage);

      const query = new GetUserUsageQuery(orgId);
      const result = await useCase.execute(query);

      expect(result.data[0].isActive).toBe(false);
    });

    it('should mark users as inactive if lastActivity is too old', async () => {
      const userId = 'user-id' as UUID;
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40); // More than 30 days ago

      const mockUserUsage = new Paginated<UserUsageItem>({
        data: [
          new UserUsageItem(
            userId,
            'Test User',
            'test@example.com',
            100,
            5,
            undefined,
            oldDate,
            false,
            [],
          ),
        ],
        limit: 50,
        offset: 0,
        total: 1,
      });

      jest
        .spyOn(mockUsageRepository, 'getUserUsage')
        .mockResolvedValue(mockUserUsage);

      const query = new GetUserUsageQuery(orgId);
      const result = await useCase.execute(query);

      expect(result.data[0].isActive).toBe(false);
    });
  });

  describe('date range validation', () => {
    it('should throw InvalidDateRangeError when start date is after end date', async () => {
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01');
      const query = new GetUserUsageQuery(orgId, startDate, endDate);

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when start date is in the future', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 2);
      const query = new GetUserUsageQuery(orgId, startDate, endDate);

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when date range exceeds 730 days', async () => {
      const startDate = new Date('2022-01-01');
      const endDate = new Date('2024-12-31'); // More than 2 years
      const query = new GetUserUsageQuery(orgId, startDate, endDate);

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should accept valid date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const query = new GetUserUsageQuery(orgId, startDate, endDate);

      jest.spyOn(mockUsageRepository, 'getUserUsage').mockResolvedValue(
        new Paginated<UserUsageItem>({
          data: [],
          limit: 50,
          offset: 0,
          total: 0,
        }),
      );

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });
  });

  describe('pagination validation', () => {
    it('should throw InvalidPaginationError when limit is zero', async () => {
      const query = new GetUserUsageQuery(orgId, undefined, undefined, {
        limit: 0,
        offset: 0,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidPaginationError,
      );
    });

    it('should throw InvalidPaginationError when limit is negative', async () => {
      const query = new GetUserUsageQuery(orgId, undefined, undefined, {
        limit: -1,
        offset: 0,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidPaginationError,
      );
    });

    it('should throw InvalidPaginationError when limit exceeds maximum', async () => {
      const query = new GetUserUsageQuery(orgId, undefined, undefined, {
        limit: UsageConstants.MAX_USER_USAGE_LIMIT + 1,
        offset: 0,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidPaginationError,
      );
    });

    it('should throw InvalidPaginationError when offset is negative', async () => {
      const query = new GetUserUsageQuery(orgId, undefined, undefined, {
        limit: 50,
        offset: -1,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidPaginationError,
      );
    });

    it('should accept valid pagination', async () => {
      const query = new GetUserUsageQuery(orgId, undefined, undefined, {
        limit: 50,
        offset: 0,
      });

      jest.spyOn(mockUsageRepository, 'getUserUsage').mockResolvedValue(
        new Paginated<UserUsageItem>({
          data: [],
          limit: 50,
          offset: 0,
          total: 0,
        }),
      );

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });
  });

  describe('sort validation', () => {
    it('should throw InvalidPaginationError for invalid sort field', async () => {
      const query = new GetUserUsageQuery(
        orgId,
        undefined,
        undefined,
        undefined,
        undefined,
        'invalid' as any,
      );

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidPaginationError,
      );
    });

    it('should throw InvalidPaginationError for invalid sort order', async () => {
      const query = new GetUserUsageQuery(
        orgId,
        undefined,
        undefined,
        undefined,
        undefined,
        'tokens',
        'invalid' as any,
      );

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidPaginationError,
      );
    });

    it('should accept valid sort parameters', async () => {
      const query = new GetUserUsageQuery(
        orgId,
        undefined,
        undefined,
        undefined,
        undefined,
        'tokens',
        'desc',
      );

      jest.spyOn(mockUsageRepository, 'getUserUsage').mockResolvedValue(
        new Paginated<UserUsageItem>({
          data: [],
          limit: 50,
          offset: 0,
          total: 0,
        }),
      );

      await expect(useCase.execute(query)).resolves.toBeDefined();
    });
  });
});
