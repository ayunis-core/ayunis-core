import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { UsageRepository } from '../../ports/usage.repository';
import { GetMonthlyCreditUsageForUsersUseCase } from './get-monthly-credit-usage-for-users.use-case';
import { GetMonthlyCreditUsageForUsersQuery } from './get-monthly-credit-usage-for-users.query';

describe('GetMonthlyCreditUsageForUsersUseCase', () => {
  let useCase: GetMonthlyCreditUsageForUsersUseCase;
  let repository: { getMonthlyCreditUsagePerUser: jest.Mock };

  const userA = '11111111-1111-1111-1111-111111111111' as UUID;
  const userB = '22222222-2222-2222-2222-222222222222' as UUID;

  beforeEach(async () => {
    repository = { getMonthlyCreditUsagePerUser: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMonthlyCreditUsageForUsersUseCase,
        { provide: UsageRepository, useValue: repository },
      ],
    }).compile();

    useCase = module.get(GetMonthlyCreditUsageForUsersUseCase);
  });

  it('returns the per-user consumption map for the current window', async () => {
    const usage = new Map<UUID, number>([
      [userA, 1240],
      [userB, 80],
    ]);
    repository.getMonthlyCreditUsagePerUser.mockResolvedValue(usage);

    const result = await useCase.execute(
      new GetMonthlyCreditUsageForUsersQuery([userA, userB]),
    );

    expect(result).toBe(usage);
    expect(repository.getMonthlyCreditUsagePerUser).toHaveBeenCalledWith(
      [userA, userB],
      expect.any(Date),
    );
  });

  it('measures from the calendar-month start when no anchor is given', async () => {
    repository.getMonthlyCreditUsagePerUser.mockResolvedValue(new Map());

    await useCase.execute(new GetMonthlyCreditUsageForUsersQuery([userA]));

    const [, monthStart] =
      repository.getMonthlyCreditUsagePerUser.mock.calls[0];
    const now = new Date();
    expect(monthStart.getUTCFullYear()).toBe(now.getUTCFullYear());
    expect(monthStart.getUTCMonth()).toBe(now.getUTCMonth());
    expect(monthStart.getUTCDate()).toBe(1);
  });

  it('floors the window at the anchor when it falls later in the month', async () => {
    repository.getMonthlyCreditUsagePerUser.mockResolvedValue(new Map());
    const now = new Date();
    const anchor = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15),
    );

    await useCase.execute(
      new GetMonthlyCreditUsageForUsersQuery([userA], anchor),
    );

    const [, effectiveStart] =
      repository.getMonthlyCreditUsagePerUser.mock.calls[0];
    expect(effectiveStart).toEqual(anchor);
  });
});
