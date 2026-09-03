import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CreditBudgetGuardService } from './credit-budget-guard.service';
import { GetMonthlyCreditLimitUseCase } from 'src/iam/subscriptions/application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.use-case';
import { GetMonthlyCreditUsageUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage/get-monthly-credit-usage.use-case';
import { CreditBudgetExceededError } from 'src/iam/subscriptions/application/subscription.errors';
import { GetMonthlyCreditUsageQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage/get-monthly-credit-usage.query';
import type { UUID } from 'crypto';

describe('CreditBudgetGuardService', () => {
  let service: CreditBudgetGuardService;
  let mockGetMonthlyCreditLimit: { execute: jest.Mock };
  let mockGetMonthlyCreditUsage: { execute: jest.Mock };

  const orgId = 'org-id' as UUID;

  beforeAll(async () => {
    mockGetMonthlyCreditLimit = {
      execute: jest.fn().mockResolvedValue({ monthlyCredits: null }),
    };
    mockGetMonthlyCreditUsage = {
      execute: jest.fn().mockResolvedValue({ creditsUsed: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditBudgetGuardService,
        {
          provide: GetMonthlyCreditLimitUseCase,
          useValue: mockGetMonthlyCreditLimit,
        },
        {
          provide: GetMonthlyCreditUsageUseCase,
          useValue: mockGetMonthlyCreditUsage,
        },
      ],
    }).compile();

    service = module.get<CreditBudgetGuardService>(CreditBudgetGuardService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass through when no usage-based subscription exists', async () => {
    mockGetMonthlyCreditLimit.execute.mockResolvedValue({
      monthlyCredits: null,
    });

    await expect(service.ensureBudgetAvailable(orgId)).resolves.toBeUndefined();
    expect(mockGetMonthlyCreditUsage.execute).not.toHaveBeenCalled();
  });

  it('should pass through when credits remain', async () => {
    mockGetMonthlyCreditLimit.execute.mockResolvedValue({
      monthlyCredits: 1000,
    });
    mockGetMonthlyCreditUsage.execute.mockResolvedValue({ creditsUsed: 500 });

    await expect(service.ensureBudgetAvailable(orgId)).resolves.toBeUndefined();
  });

  it('should throw CreditBudgetExceededError when credits are exactly exhausted', async () => {
    mockGetMonthlyCreditLimit.execute.mockResolvedValue({
      monthlyCredits: 1000,
    });
    mockGetMonthlyCreditUsage.execute.mockResolvedValue({ creditsUsed: 1000 });

    await expect(service.ensureBudgetAvailable(orgId)).rejects.toThrow(
      CreditBudgetExceededError,
    );
  });

  it('should throw CreditBudgetExceededError when credits are exceeded', async () => {
    mockGetMonthlyCreditLimit.execute.mockResolvedValue({
      monthlyCredits: 1000,
    });
    mockGetMonthlyCreditUsage.execute.mockResolvedValue({ creditsUsed: 1500 });

    await expect(service.ensureBudgetAvailable(orgId)).rejects.toThrow(
      CreditBudgetExceededError,
    );
  });

  it('should pass through when budget is zero and no usage', async () => {
    mockGetMonthlyCreditLimit.execute.mockResolvedValue({
      monthlyCredits: 0,
    });
    mockGetMonthlyCreditUsage.execute.mockResolvedValue({ creditsUsed: 0 });

    await expect(service.ensureBudgetAvailable(orgId)).rejects.toThrow(
      CreditBudgetExceededError,
    );
  });

  it('should pass startsAt as since to credit usage query', async () => {
    const startsAt = new Date('2026-04-10T00:00:00.000Z');
    mockGetMonthlyCreditLimit.execute.mockResolvedValue({
      monthlyCredits: 1000,
      startsAt,
    });
    mockGetMonthlyCreditUsage.execute.mockResolvedValue({ creditsUsed: 0 });

    await service.ensureBudgetAvailable(orgId);

    expect(mockGetMonthlyCreditUsage.execute).toHaveBeenCalledWith(
      new GetMonthlyCreditUsageQuery(orgId, startsAt),
    );
  });

  it('should pass undefined since when startsAt is null', async () => {
    mockGetMonthlyCreditLimit.execute.mockResolvedValue({
      monthlyCredits: 1000,
      startsAt: null,
    });
    mockGetMonthlyCreditUsage.execute.mockResolvedValue({ creditsUsed: 0 });

    await service.ensureBudgetAvailable(orgId);

    expect(mockGetMonthlyCreditUsage.execute).toHaveBeenCalledWith(
      new GetMonthlyCreditUsageQuery(orgId, undefined),
    );
  });
});
