import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetUserUsageUseCase } from './get-user-usage.use-case';
import { GetUserUsageQuery } from './get-user-usage.query';
import { UsageRepository } from '../../ports/usage.repository';
import {
  InvalidDateRangeError,
  InvalidPaginationError,
} from '../../usage.errors';
import { Paginated } from 'src/common/pagination';
import { UserUsageItem } from '../../../domain/user-usage-item.entity';
import type { UUID } from 'crypto';
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

      const mockUserUsage = new Paginated<UserUsageItem>({
        data: [
          new UserUsageItem({
            userId,
            userName: 'Test User',
            userEmail: 'test@example.com',
            tokens: 100,
            requests: 5,
            lastActivity: new Date(),
            isActive: true,
          }),
        ],
        limit: 50,
        offset: 0,
        total: 1,
      });

      jest
        .spyOn(mockUsageRepository, 'getUserUsage')
        .mockResolvedValue(mockUserUsage);

      const query = new GetUserUsageQuery({ organizationId: orgId });

      const result = await useCase.execute(query);

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].userId).toBe(userId);
      expect(result.data[0].isActive).toBe(true);
    });

    it('should mark users as inactive if lastActivity is null', async () => {
      const userId = 'user-id' as UUID;
      const mockUserUsage = new Paginated<UserUsageItem>({
        data: [
          new UserUsageItem({
            userId,
            userName: 'Test User',
            userEmail: 'test@example.com',
            tokens: 0,
            requests: 0,
            lastActivity: null, // No activity
            isActive: false,
          }),
        ],
        limit: 50,
        offset: 0,
        total: 1,
      });

      jest
        .spyOn(mockUsageRepository, 'getUserUsage')
        .mockResolvedValue(mockUserUsage);

      const query = new GetUserUsageQuery({ organizationId: orgId });
      const result = await useCase.execute(query);

      expect(result.data[0].isActive).toBe(false);
    });

    it('should mark users as inactive if lastActivity is too old', async () => {
      const userId = 'user-id' as UUID;
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40); // More than 30 days ago

      const mockUserUsage = new Paginated<UserUsageItem>({
        data: [
          new UserUsageItem({
            userId,
            userName: 'Test User',
            userEmail: 'test@example.com',
            tokens: 100,
            requests: 5,
            lastActivity: oldDate,
            isActive: false,
          }),
        ],
        limit: 50,
        offset: 0,
        total: 1,
      });

      jest
        .spyOn(mockUsageRepository, 'getUserUsage')
        .mockResolvedValue(mockUserUsage);

      const query = new GetUserUsageQuery({ organizationId: orgId });
      const result = await useCase.execute(query);

      expect(result.data[0].isActive).toBe(false);
    });
  });

  describe('date range validation', () => {
    it('should throw InvalidDateRangeError when start date is after end date', async () => {
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01');
      const query = new GetUserUsageQuery({
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
      const query = new GetUserUsageQuery({
        organizationId: orgId,
        startDate,
        endDate,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidDateRangeError,
      );
    });

    it('should throw InvalidDateRangeError when date range exceeds 730 days', async () => {
      const startDate = new Date('2022-01-01');
      const endDate = new Date('2024-12-31'); // More than 2 years
      const query = new GetUserUsageQuery({
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
      const query = new GetUserUsageQuery({
        organizationId: orgId,
        startDate,
        endDate,
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

  describe('pagination validation', () => {
    it('should throw InvalidPaginationError when limit is zero', async () => {
      const query = new GetUserUsageQuery({
        organizationId: orgId,
        limit: 0,
        offset: 0,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidPaginationError,
      );
    });

    it('should throw InvalidPaginationError when limit is negative', async () => {
      const query = new GetUserUsageQuery({
        organizationId: orgId,
        limit: -1,
        offset: 0,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidPaginationError,
      );
    });

    it('should throw InvalidPaginationError when limit exceeds maximum', async () => {
      const query = new GetUserUsageQuery({
        organizationId: orgId,
        limit: UsageConstants.MAX_USER_USAGE_LIMIT + 1,
        offset: 0,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidPaginationError,
      );
    });

    it('should throw InvalidPaginationError when offset is negative', async () => {
      const query = new GetUserUsageQuery({
        organizationId: orgId,
        limit: 50,
        offset: -1,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidPaginationError,
      );
    });

    it('should accept valid pagination', async () => {
      const query = new GetUserUsageQuery({
        organizationId: orgId,
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
      const query = new GetUserUsageQuery({
        organizationId: orgId,
        sortBy: 'invalid' as any,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidPaginationError,
      );
    });

    it('should throw InvalidPaginationError for invalid sort order', async () => {
      const query = new GetUserUsageQuery({
        organizationId: orgId,
        sortBy: 'tokens',
        sortOrder: 'invalid' as any,
      });

      await expect(useCase.execute(query)).rejects.toThrow(
        InvalidPaginationError,
      );
    });

    it('should accept valid sort parameters', async () => {
      const query = new GetUserUsageQuery({
        organizationId: orgId,
        sortBy: 'tokens',
        sortOrder: 'desc',
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
});
