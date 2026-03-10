import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetCreditUsageUseCase } from './get-credit-usage.use-case';
import { GetCreditUsageQuery } from './get-credit-usage.query';
import { GetMonthlyCreditUsageUseCase } from '../get-monthly-credit-usage/get-monthly-credit-usage.use-case';
import { GetMonthlyCreditLimitUseCase } from 'src/iam/subscriptions/application/use-cases/get-monthly-credit-limit/get-monthly-credit-limit.use-case';
import type { UUID } from 'crypto';

describe('GetCreditUsageUseCase', () => {
  let useCase: GetCreditUsageUseCase;
  let mockGetMonthlyCreditLimit: { execute: jest.Mock };
  let mockMonthlyCreditUsage: { execute: jest.Mock };

  const orgId = '550e8400-e29b-41d4-a716-446655440000' as UUID;

  beforeEach(async () => {
    mockGetMonthlyCreditLimit = {
      execute: jest.fn(),
    };

    mockMonthlyCreditUsage = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCreditUsageUseCase,
        {
          provide: GetMonthlyCreditLimitUseCase,
          useValue: mockGetMonthlyCreditLimit,
        },
        {
          provide: GetMonthlyCreditUsageUseCase,
          useValue: mockMonthlyCreditUsage,
        },
      ],
    }).compile();

    useCase = module.get<GetCreditUsageUseCase>(GetCreditUsageUseCase);
  });

  it('should return null credits when no usage-based subscription exists', async () => {
    mockGetMonthlyCreditLimit.execute.mockResolvedValue({
      monthlyCredits: null,
    });
    mockMonthlyCreditUsage.execute.mockResolvedValue({ creditsUsed: 150 });

    const result = await useCase.execute(new GetCreditUsageQuery(orgId));

    expect(result).toEqual({
      monthlyCredits: null,
      creditsUsed: 150,
      creditsRemaining: null,
    });
  });

  it('should return credit budget and remaining credits for usage-based subscription', async () => {
    mockGetMonthlyCreditLimit.execute.mockResolvedValue({
      monthlyCredits: 10000,
    });
    mockMonthlyCreditUsage.execute.mockResolvedValue({ creditsUsed: 4250.5 });

    const result = await useCase.execute(new GetCreditUsageQuery(orgId));

    expect(result).toEqual({
      monthlyCredits: 10000,
      creditsUsed: 4250.5,
      creditsRemaining: 5749.5,
    });
  });

  it('should clamp remaining credits to zero when usage exceeds budget', async () => {
    mockGetMonthlyCreditLimit.execute.mockResolvedValue({
      monthlyCredits: 1000,
    });
    mockMonthlyCreditUsage.execute.mockResolvedValue({ creditsUsed: 1500 });

    const result = await useCase.execute(new GetCreditUsageQuery(orgId));

    expect(result).toEqual({
      monthlyCredits: 1000,
      creditsUsed: 1500,
      creditsRemaining: 0,
    });
  });

  it('should return zero credits used when there is no usage this month', async () => {
    mockGetMonthlyCreditLimit.execute.mockResolvedValue({
      monthlyCredits: 5000,
    });
    mockMonthlyCreditUsage.execute.mockResolvedValue({ creditsUsed: 0 });

    const result = await useCase.execute(new GetCreditUsageQuery(orgId));

    expect(result).toEqual({
      monthlyCredits: 5000,
      creditsUsed: 0,
      creditsRemaining: 5000,
    });
  });

  it('should propagate errors from the credit limit use case', async () => {
    mockGetMonthlyCreditLimit.execute.mockRejectedValue(
      new Error('Database connection failed'),
    );

    await expect(
      useCase.execute(new GetCreditUsageQuery(orgId)),
    ).rejects.toThrow('Database connection failed');
  });

  it('should propagate errors from the monthly credit usage use case', async () => {
    mockGetMonthlyCreditLimit.execute.mockResolvedValue({
      monthlyCredits: 10000,
    });
    mockMonthlyCreditUsage.execute.mockRejectedValue(
      new Error('Usage query timed out'),
    );

    await expect(
      useCase.execute(new GetCreditUsageQuery(orgId)),
    ).rejects.toThrow('Usage query timed out');
  });
});
