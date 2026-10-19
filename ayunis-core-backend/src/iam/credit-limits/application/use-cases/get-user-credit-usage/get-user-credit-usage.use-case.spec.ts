import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { GetMonthlyCreditUsageForUsersUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-users/get-monthly-credit-usage-for-users.use-case';
import {
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/iam/credit-limits/application/testing/credit-limit.fixtures';
import { GetUserCreditUsageUseCase } from './get-user-credit-usage.use-case';
import { GetUserCreditUsageQuery } from './get-user-credit-usage.query';

describe('GetUserCreditUsageUseCase', () => {
  let useCase: GetUserCreditUsageUseCase;
  let context: { get: jest.Mock };
  let findOrg: { execute: jest.Mock };
  let getUsage: { execute: jest.Mock };

  const otherUserId = '55555555-5555-5555-5555-555555555555' as UUID;

  beforeEach(async () => {
    context = {
      get: jest.fn(
        (key: string) =>
          (
            ({
              orgId: TEST_ORG_ID,
              userId: TEST_USER_ID,
              role: 'admin',
              systemRole: 'customer',
            }) as Record<string, unknown>
          )[key],
      ),
    };
    findOrg = {
      execute: jest.fn().mockResolvedValue({ hideIndividualUsage: false }),
    };
    getUsage = {
      execute: jest
        .fn()
        .mockResolvedValue(new Map<UUID, number>([[TEST_USER_ID, 120]])),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserCreditUsageUseCase,
        { provide: ContextService, useValue: context },
        { provide: FindOrgByIdUseCase, useValue: findOrg },
        { provide: GetMonthlyCreditUsageForUsersUseCase, useValue: getUsage },
      ],
    }).compile();

    useCase = module.get(GetUserCreditUsageUseCase);
  });

  it('returns the monthly consumption of every requested user, zero when none was recorded', async () => {
    const result = await useCase.execute(
      new GetUserCreditUsageQuery([TEST_USER_ID, otherUserId]),
    );

    expect(result).toEqual([
      { userId: TEST_USER_ID, creditsUsed: 120 },
      { userId: otherUserId, creditsUsed: 0 },
    ]);
    expect(getUsage.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: TEST_ORG_ID,
        userIds: [TEST_USER_ID, otherUserId],
      }),
    );
  });

  it('omits consumption when individual usage is hidden', async () => {
    findOrg.execute.mockResolvedValue({ hideIndividualUsage: true });
    expect(
      await useCase.execute(new GetUserCreditUsageQuery([TEST_USER_ID])),
    ).toEqual([{ userId: TEST_USER_ID }]);
    expect(getUsage.execute).not.toHaveBeenCalled();
  });

  it('keeps consumption visible to super admins when individual usage is hidden', async () => {
    findOrg.execute.mockResolvedValue({ hideIndividualUsage: true });
    context.get.mockImplementation(
      (key: string) =>
        (
          ({
            orgId: TEST_ORG_ID,
            userId: TEST_USER_ID,
            role: 'admin',
            systemRole: 'super_admin',
          }) as Record<string, unknown>
        )[key],
    );
    expect(
      await useCase.execute(new GetUserCreditUsageQuery([TEST_USER_ID])),
    ).toEqual([{ userId: TEST_USER_ID, creditsUsed: 120 }]);
  });

  it('queries each user once even when an id is repeated', async () => {
    const result = await useCase.execute(
      new GetUserCreditUsageQuery([TEST_USER_ID, TEST_USER_ID]),
    );

    expect(result).toEqual([{ userId: TEST_USER_ID, creditsUsed: 120 }]);
    expect(getUsage.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: [TEST_USER_ID] }),
    );
  });

  it('returns an empty list without querying when no users are requested', async () => {
    const result = await useCase.execute(new GetUserCreditUsageQuery([]));

    expect(result).toEqual([]);
    expect(getUsage.execute).not.toHaveBeenCalled();
  });

  it('throws when there is no organization in context', async () => {
    context.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(new GetUserCreditUsageQuery([TEST_USER_ID])),
    ).rejects.toThrow(UnauthorizedAccessError);
  });
});
