import type { UUID } from 'crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { FindAllUserIdsByTeamIdsQuery } from './find-all-user-ids-by-team-ids.query';
import { FindAllUserIdsByTeamIdsUseCase } from './find-all-user-ids-by-team-ids.use-case';

const ORGANIZATION_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const FIRST_TEAM_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const SECOND_TEAM_ID = '33333333-3333-3333-3333-333333333333' as UUID;
const FIRST_USER_ID = '44444444-4444-4444-4444-444444444444' as UUID;
const SECOND_USER_ID = '55555555-5555-5555-5555-555555555555' as UUID;

describe('FindAllUserIdsByTeamIdsUseCase', () => {
  let useCase: FindAllUserIdsByTeamIdsUseCase;
  let repository: { findAllUserIdsByTeamIds: jest.Mock };

  beforeEach(async () => {
    repository = { findAllUserIdsByTeamIds: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAllUserIdsByTeamIdsUseCase,
        { provide: TeamMembersRepository, useValue: repository },
      ],
    }).compile();
    useCase = module.get(FindAllUserIdsByTeamIdsUseCase);
  });

  it('returns current user IDs grouped by requested team IDs', async () => {
    const groupedUserIds = new Map<UUID, UUID[]>([
      [FIRST_TEAM_ID, [FIRST_USER_ID, SECOND_USER_ID]],
      [SECOND_TEAM_ID, [SECOND_USER_ID]],
    ]);
    repository.findAllUserIdsByTeamIds.mockResolvedValue(groupedUserIds);

    const result = await useCase.execute(
      new FindAllUserIdsByTeamIdsQuery(ORGANIZATION_ID, [
        FIRST_TEAM_ID,
        SECOND_TEAM_ID,
      ]),
    );

    expect(result).toBe(groupedUserIds);
    expect(repository.findAllUserIdsByTeamIds).toHaveBeenCalledWith(
      ORGANIZATION_ID,
      [FIRST_TEAM_ID, SECOND_TEAM_ID],
    );
  });
});
