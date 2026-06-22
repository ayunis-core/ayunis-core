import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { UsageRepository } from '../../ports/usage.repository';
import { GetMonthlyCreditUsageForUserUseCase } from './get-monthly-credit-usage-for-user.use-case';
import { GetMonthlyCreditUsageForUserQuery } from './get-monthly-credit-usage-for-user.query';

describe('GetMonthlyCreditUsageForUserUseCase', () => {
  let useCase: GetMonthlyCreditUsageForUserUseCase;
  let repository: { getMonthlyCreditUsageForUser: jest.Mock };

  const userId = '22222222-2222-2222-2222-222222222222' as UUID;

  beforeEach(async () => {
    repository = { getMonthlyCreditUsageForUser: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMonthlyCreditUsageForUserUseCase,
        { provide: UsageRepository, useValue: repository },
      ],
    }).compile();

    useCase = module.get(GetMonthlyCreditUsageForUserUseCase);
  });

  it('returns the credits the user has consumed in the current window', async () => {
    repository.getMonthlyCreditUsageForUser.mockResolvedValue(1240);

    const result = await useCase.execute(
      new GetMonthlyCreditUsageForUserQuery(userId),
    );

    expect(result.creditsUsed).toBe(1240);
  });

  it('measures from the calendar-month start when no subscription anchor is given', async () => {
    repository.getMonthlyCreditUsageForUser.mockResolvedValue(0);

    await useCase.execute(new GetMonthlyCreditUsageForUserQuery(userId));

    const [, monthStart] =
      repository.getMonthlyCreditUsageForUser.mock.calls[0];
    const now = new Date();
    expect(monthStart.getUTCFullYear()).toBe(now.getUTCFullYear());
    expect(monthStart.getUTCMonth()).toBe(now.getUTCMonth());
    expect(monthStart.getUTCDate()).toBe(1);
  });

  it('floors the window at the subscription anchor when it falls later in the month', async () => {
    repository.getMonthlyCreditUsageForUser.mockResolvedValue(0);
    const now = new Date();
    const anchor = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15),
    );

    await useCase.execute(
      new GetMonthlyCreditUsageForUserQuery(userId, anchor),
    );

    const [, effectiveStart] =
      repository.getMonthlyCreditUsageForUser.mock.calls[0];
    expect(effectiveStart).toEqual(anchor);
  });
});
