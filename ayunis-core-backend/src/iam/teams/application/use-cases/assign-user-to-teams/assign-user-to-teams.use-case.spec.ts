import type { UUID } from 'crypto';
import { AssignUserToTeamsCommand } from './assign-user-to-teams.command';
import { AssignUserToTeamsUseCase } from './assign-user-to-teams.use-case';
import type { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import type { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import type { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { Team } from 'src/iam/teams/domain/team.entity';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { TeamNotFoundError } from 'src/iam/teams/application/teams.errors';
import { UserNotInSameOrgError } from 'src/iam/teams/application/team-members.errors';

describe(AssignUserToTeamsUseCase.name, () => {
  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const userId = '22222222-2222-2222-2222-222222222222' as UUID;
  const researchId = '33333333-3333-3333-3333-333333333333' as UUID;
  const operationsId = '44444444-4444-4444-4444-444444444444' as UUID;
  let teams: jest.Mocked<TeamsRepository>;
  let members: jest.Mocked<TeamMembersRepository>;
  let findUser: jest.Mocked<FindUserByIdUseCase>;
  let useCase: AssignUserToTeamsUseCase;

  beforeEach(() => {
    teams = {
      findByIdsAndOrgId: jest
        .fn()
        .mockResolvedValue([
          new Team({ id: researchId, name: 'Research', orgId }),
          new Team({ id: operationsId, name: 'Operations', orgId }),
        ]),
    } as unknown as jest.Mocked<TeamsRepository>;
    members = {
      createMany: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<TeamMembersRepository>;
    findUser = {
      execute: jest.fn().mockResolvedValue(
        new User({
          id: userId,
          email: 'ada@example.com',
          name: 'Ada Lovelace',
          orgId,
          role: UserRole.USER,
          passwordHash: null,
          emailVerified: true,
          hasAcceptedMarketing: false,
        }),
      ),
    } as unknown as jest.Mocked<FindUserByIdUseCase>;
    useCase = new AssignUserToTeamsUseCase(teams, members, findUser);
  });

  it('assigns a user to multiple teams in one write', async () => {
    await useCase.execute(
      new AssignUserToTeamsCommand(userId, orgId, [
        researchId,
        operationsId,
        researchId,
      ]),
    );

    expect(members.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ teamId: researchId, userId }),
      expect.objectContaining({ teamId: operationsId, userId }),
    ]);
  });

  it('rejects a team outside the target organization before writing', async () => {
    const otherTeamId = '55555555-5555-5555-5555-555555555555' as UUID;

    await expect(
      useCase.execute(
        new AssignUserToTeamsCommand(userId, orgId, [otherTeamId]),
      ),
    ).rejects.toBeInstanceOf(TeamNotFoundError);
    expect(members.createMany).not.toHaveBeenCalled();
  });

  it('rejects a user outside the target organization before writing', async () => {
    findUser.execute.mockResolvedValue(
      new User({
        id: userId,
        email: 'ada@example.com',
        name: 'Ada Lovelace',
        orgId: '66666666-6666-6666-6666-666666666666',
        role: UserRole.USER,
        passwordHash: null,
        emailVerified: true,
        hasAcceptedMarketing: false,
      }),
    );

    await expect(
      useCase.execute(
        new AssignUserToTeamsCommand(userId, orgId, [researchId]),
      ),
    ).rejects.toBeInstanceOf(UserNotInSameOrgError);
    expect(members.createMany).not.toHaveBeenCalled();
  });

  it('does not query or write when no teams were requested', async () => {
    await useCase.execute(new AssignUserToTeamsCommand(userId, orgId, []));

    expect(teams.findByIdsAndOrgId).not.toHaveBeenCalled();
    expect(findUser.execute).not.toHaveBeenCalled();
    expect(members.createMany).not.toHaveBeenCalled();
  });
});
