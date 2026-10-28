import type { UUID } from 'crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { GetMonthlyCreditUsageForUsersUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-users/get-monthly-credit-usage-for-users.use-case';
import { FindAllUserIdsByTeamIdsUseCase } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-ids/find-all-user-ids-by-team-ids.use-case';
import { GetMonthlyCreditUsageForTeamsQuery } from './get-monthly-credit-usage-for-teams.query';
import { GetMonthlyCreditUsageForTeamsUseCase } from './get-monthly-credit-usage-for-teams.use-case';

const ORGANIZATION_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const FIRST_TEAM_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const SECOND_TEAM_ID = '33333333-3333-3333-3333-333333333333' as UUID;
const FIRST_USER_ID = '44444444-4444-4444-4444-444444444444' as UUID;
const SHARED_USER_ID = '55555555-5555-5555-5555-555555555555' as UUID;
const SECOND_USER_ID = '66666666-6666-6666-6666-666666666666' as UUID;

describe('GetMonthlyCreditUsageForTeamsUseCase', () => {
  let useCase: GetMonthlyCreditUsageForTeamsUseCase;
  let findMembers: { execute: jest.Mock };
  let getUsageByUser: { execute: jest.Mock };

  beforeEach(async () => {
    findMembers = { execute: jest.fn() };
    getUsageByUser = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMonthlyCreditUsageForTeamsUseCase,
        { provide: FindAllUserIdsByTeamIdsUseCase, useValue: findMembers },
        {
          provide: GetMonthlyCreditUsageForUsersUseCase,
          useValue: getUsageByUser,
        },
      ],
    }).compile();

    useCase = module.get(GetMonthlyCreditUsageForTeamsUseCase);
  });

  it('sums per-user usage into every current team pool in two batched operations', async () => {
    findMembers.execute.mockResolvedValue(
      new Map<UUID, UUID[]>([
        [FIRST_TEAM_ID, [FIRST_USER_ID, SHARED_USER_ID]],
        [SECOND_TEAM_ID, [SHARED_USER_ID, SECOND_USER_ID]],
      ]),
    );
    getUsageByUser.execute.mockResolvedValue(
      new Map<UUID, number>([
        [FIRST_USER_ID, 100],
        [SHARED_USER_ID, 50],
        [SECOND_USER_ID, 20],
      ]),
    );

    const result = await useCase.execute(
      new GetMonthlyCreditUsageForTeamsQuery(ORGANIZATION_ID, [
        FIRST_TEAM_ID,
        SECOND_TEAM_ID,
      ]),
    );

    expect(result).toEqual(
      new Map<UUID, number>([
        [FIRST_TEAM_ID, 150],
        [SECOND_TEAM_ID, 70],
      ]),
    );
    expect(findMembers.execute).toHaveBeenCalledTimes(1);
    expect(findMembers.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORGANIZATION_ID,
        teamIds: [FIRST_TEAM_ID, SECOND_TEAM_ID],
      }),
    );
    expect(getUsageByUser.execute).toHaveBeenCalledTimes(1);
    expect(getUsageByUser.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORGANIZATION_ID,
        userIds: [FIRST_USER_ID, SHARED_USER_ID, SECOND_USER_ID],
      }),
    );
  });

  it('forwards an explicit usage start to the batched per-user query', async () => {
    const since = new Date('2026-03-15T09:00:00.000Z');
    findMembers.execute.mockResolvedValue(
      new Map([[FIRST_TEAM_ID, [FIRST_USER_ID]]]),
    );
    getUsageByUser.execute.mockResolvedValue(new Map());

    await useCase.execute(
      new GetMonthlyCreditUsageForTeamsQuery(
        ORGANIZATION_ID,
        [FIRST_TEAM_ID],
        since,
      ),
    );

    expect(getUsageByUser.execute).toHaveBeenCalledWith(
      expect.objectContaining({ since }),
    );
  });
});
