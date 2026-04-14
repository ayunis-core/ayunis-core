import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetMonthlyCreditUsageUseCase } from './get-monthly-credit-usage.use-case';
import { GetMonthlyCreditUsageQuery } from './get-monthly-credit-usage.query';
import { UsageRepository } from '../../ports/usage.repository';
import type { UUID } from 'crypto';

describe('GetMonthlyCreditUsageUseCase', () => {
  let useCase: GetMonthlyCreditUsageUseCase;
  let mockUsageRepository: { getMonthlyCreditUsage: jest.Mock };

  const orgId = 'org-id' as UUID;

  beforeAll(async () => {
    mockUsageRepository = {
      getMonthlyCreditUsage: jest.fn().mockResolvedValue(42.5),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMonthlyCreditUsageUseCase,
        { provide: UsageRepository, useValue: mockUsageRepository },
      ],
    }).compile();

    useCase = module.get<GetMonthlyCreditUsageUseCase>(
      GetMonthlyCreditUsageUseCase,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsageRepository.getMonthlyCreditUsage.mockResolvedValue(42.5);
  });

  it('should return creditsUsed from repository', async () => {
    const result = await useCase.execute(new GetMonthlyCreditUsageQuery(orgId));

    expect(result).toEqual({ creditsUsed: 42.5 });
    expect(mockUsageRepository.getMonthlyCreditUsage).toHaveBeenCalledWith(
      orgId,
      expect.any(Date),
    );
  });

  it('should pass the first day of current month as monthStart', async () => {
    await useCase.execute(new GetMonthlyCreditUsageQuery(orgId));

    const monthStart = mockUsageRepository.getMonthlyCreditUsage.mock
      .calls[0][1] as Date;
    const now = new Date();
    expect(monthStart.getUTCFullYear()).toBe(now.getUTCFullYear());
    expect(monthStart.getUTCMonth()).toBe(now.getUTCMonth());
    expect(monthStart.getUTCDate()).toBe(1);
    expect(monthStart.getUTCHours()).toBe(0);
    expect(monthStart.getUTCMinutes()).toBe(0);
  });

  it('should use since date when it is later than month start', async () => {
    const since = new Date('2026-04-10T00:00:00.000Z');
    await useCase.execute(new GetMonthlyCreditUsageQuery(orgId, since));

    const startDate = mockUsageRepository.getMonthlyCreditUsage.mock
      .calls[0][1] as Date;
    expect(startDate).toEqual(since);
  });

  it('should use month start when since date is earlier', async () => {
    const since = new Date('2025-12-15T00:00:00.000Z');
    await useCase.execute(new GetMonthlyCreditUsageQuery(orgId, since));

    const startDate = mockUsageRepository.getMonthlyCreditUsage.mock
      .calls[0][1] as Date;
    const now = new Date();
    expect(startDate.getUTCFullYear()).toBe(now.getUTCFullYear());
    expect(startDate.getUTCMonth()).toBe(now.getUTCMonth());
    expect(startDate.getUTCDate()).toBe(1);
  });

  it('should handle zero usage (new month)', async () => {
    mockUsageRepository.getMonthlyCreditUsage.mockResolvedValue(0);

    const result = await useCase.execute(new GetMonthlyCreditUsageQuery(orgId));

    expect(result).toEqual({ creditsUsed: 0 });
  });
});
