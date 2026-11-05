import { randomUUID } from 'crypto';
import { TeamAccessService } from './team-access.service';
import type { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import type { GetMyPermissionsUseCase } from 'src/iam/permissions/application/use-cases/get-my-permissions/get-my-permissions.use-case';
import type { GetMyPermissionsQuery } from 'src/iam/permissions/application/use-cases/get-my-permissions/get-my-permissions.query';
import { TeamMember } from 'src/iam/teams/domain/team-member.entity';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

const orgId = randomUUID();
const userId = randomUUID();
const teamId = randomUUID();
const otherTeamId = randomUUID();

const MATRIX: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission),
  [UserRole.MANAGER]: [
    Permission.ASSIGN_USERS_TO_TEAMS,
    Permission.SHARE_SKILLS_WITH_TEAMS,
  ],
  [UserRole.USER]: [Permission.MANAGE_SKILLS],
};

function createService(memberships: TeamMember[]) {
  const teamMembersRepository = {
    findByTeamIdAndUserId: jest.fn((id: string) =>
      Promise.resolve(memberships.find((m) => m.teamId === id) ?? null),
    ),
    findByUserId: jest.fn(() => Promise.resolve(memberships)),
  };
  const getMyPermissions = {
    execute: jest.fn((query: GetMyPermissionsQuery) =>
      Promise.resolve(MATRIX[query.role]),
    ),
  };
  const service = new TeamAccessService(
    teamMembersRepository as unknown as TeamMembersRepository,
    getMyPermissions as unknown as GetMyPermissionsUseCase,
  );
  return { service, getMyPermissions };
}

const member = (role: UserRole, id = teamId) =>
  new TeamMember({ teamId: id, userId, role });

describe(TeamAccessService.name, () => {
  const user = { userId, orgId, role: UserRole.USER };

  it('grants only organisation permissions to a non-member', async () => {
    const { service } = createService([]);

    const access = await service.forTeam(user, teamId);

    expect(access.teamRole).toBeNull();
    expect(access.permissions).toEqual([Permission.MANAGE_SKILLS]);
  });

  it('adds the manager row of the matrix for a team manager', async () => {
    const { service } = createService([member(UserRole.MANAGER)]);

    const access = await service.forTeam(user, teamId);

    expect(access.teamRole).toBe(UserRole.MANAGER);
    expect(access.can(Permission.ASSIGN_USERS_TO_TEAMS)).toBe(true);
    expect(access.canOrgWide(Permission.ASSIGN_USERS_TO_TEAMS)).toBe(false);
    expect(access.can(Permission.SHARE_SKILLS_WITH_TEAMS)).toBe(true);
    expect(access.can(Permission.SHARE_SKILLS_WITH_ORG)).toBe(false);
    expect(access.canManageRoles).toBe(false);
  });

  it('grants every permission in the team to a team admin', async () => {
    const { service } = createService([member(UserRole.ADMIN)]);

    const access = await service.forTeam(user, teamId);

    expect(access.permissions).toEqual(Object.values(Permission));
    expect(access.canOrgWide(Permission.ASSIGN_USERS_TO_TEAMS)).toBe(false);
    expect(access.canManageRoles).toBe(true);
  });

  it('lets organisation-wide member management manage roles', async () => {
    const { service } = createService([]);

    const access = await service.forTeam(
      { ...user, role: UserRole.MANAGER },
      teamId,
    );

    expect(access.canManageRoles).toBe(true);
  });

  it('resolves each membership and loads each role once', async () => {
    const { service, getMyPermissions } = createService([
      member(UserRole.ADMIN),
      member(UserRole.USER, otherTeamId),
    ]);

    const { orgAccess, byTeamId } = await service.forMemberships(user);

    expect(orgAccess.teamRole).toBeNull();
    expect(byTeamId.get(teamId)?.canManageRoles).toBe(true);
    expect(byTeamId.get(otherTeamId)?.permissions).toEqual([
      Permission.MANAGE_SKILLS,
    ]);
    expect(getMyPermissions.execute).toHaveBeenCalledTimes(2);
  });
});
