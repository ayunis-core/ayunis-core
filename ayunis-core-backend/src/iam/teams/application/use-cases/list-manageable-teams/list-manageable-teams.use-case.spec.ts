import { randomUUID, type UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { ListManageableTeamsUseCase } from './list-manageable-teams.use-case';
import type { TeamsRepository } from 'src/iam/teams/application/ports/teams.repository';
import type { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import type { TeamAccessService } from 'src/iam/teams/application/services/team-access.service';
import { TeamAccess } from 'src/iam/teams/application/models/team-access.model';
import { Team } from 'src/iam/teams/domain/team.entity';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

const orgId = randomUUID();
const userId = randomUUID();

const access = (teamRole: UserRole | null, permissions: Permission[]) =>
  new TeamAccess({
    teamRole,
    orgPermissions: [],
    teamPermissions: permissions,
  });

function createUseCase(options: {
  orgPermissions: Permission[];
  byTeamId: Map<UUID, TeamAccess>;
}) {
  const userContext: Record<string, unknown> = {
    userId,
    orgId,
    role: UserRole.USER,
    systemRole: SystemRole.CUSTOMER,
  };
  const allTeams = [
    new Team({ name: 'A', orgId }),
    new Team({ name: 'B', orgId }),
  ];
  const teamsRepository = {
    findByOrgId: jest.fn().mockResolvedValue(allTeams),
    findByIdsAndOrgId: jest.fn((ids: UUID[]) =>
      Promise.resolve(ids.map((id) => new Team({ id, name: id, orgId }))),
    ),
  };
  const teamMembersRepository = {
    countByTeamIds: jest.fn().mockResolvedValue(new Map()),
  };
  const teamAccessService = {
    forMemberships: jest.fn().mockResolvedValue({
      orgAccess: new TeamAccess({
        teamRole: null,
        orgPermissions: options.orgPermissions,
        teamPermissions: [],
      }),
      byTeamId: options.byTeamId,
    }),
  };
  const useCase = new ListManageableTeamsUseCase(
    teamsRepository as unknown as TeamsRepository,
    teamMembersRepository as unknown as TeamMembersRepository,
    teamAccessService as unknown as TeamAccessService,
    {
      get: jest.fn((key: string) => userContext[key]),
    } as unknown as ContextService,
  );
  return { useCase, teamsRepository, allTeams };
}

describe(ListManageableTeamsUseCase.name, () => {
  it.each([Permission.MANAGE_TEAMS, Permission.ASSIGN_USERS_TO_TEAMS])(
    'lists every team for an organisation-wide holder of %s',
    async (permission) => {
      const { useCase, allTeams } = createUseCase({
        orgPermissions: [permission],
        byTeamId: new Map(),
      });

      const result = await useCase.execute();

      expect(result.map(({ team }) => team)).toEqual(allTeams);
    },
  );

  it('lists only the teams a team role lets the user manage', async () => {
    const adminTeam = randomUUID();
    const managerTeam = randomUUID();
    const memberTeam = randomUUID();
    const { useCase, teamsRepository } = createUseCase({
      orgPermissions: [],
      byTeamId: new Map([
        [adminTeam, access(UserRole.ADMIN, Object.values(Permission))],
        [managerTeam, access(UserRole.MANAGER, [Permission.MANAGE_TEAMS])],
        [memberTeam, access(UserRole.USER, [Permission.MANAGE_SKILLS])],
      ]),
    });

    const result = await useCase.execute();

    expect(teamsRepository.findByOrgId).not.toHaveBeenCalled();
    expect(teamsRepository.findByIdsAndOrgId).toHaveBeenCalledWith(
      [adminTeam, managerTeam],
      orgId,
    );
    expect(result).toHaveLength(2);
  });

  it('lists nothing for a user without any team management', async () => {
    const { useCase } = createUseCase({
      orgPermissions: [],
      byTeamId: new Map(),
    });

    await expect(useCase.execute()).resolves.toEqual([]);
  });
});
