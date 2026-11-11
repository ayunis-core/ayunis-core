import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { GetTeamRolePermissionsUseCase } from './get-team-role-permissions.use-case';
import { GetTeamRolePermissionsQuery } from './get-team-role-permissions.query';
import type { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { TeamNotFoundError } from 'src/iam/teams/application/teams.errors';
import type { GetMyPermissionsUseCase } from 'src/iam/permissions/application/use-cases/get-my-permissions/get-my-permissions.use-case';
import type { GetMyPermissionsQuery } from 'src/iam/permissions/application/use-cases/get-my-permissions/get-my-permissions.query';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

const orgId = randomUUID();
const teamId = randomUUID();

const MATRIX: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission),
  [UserRole.MANAGER]: [
    Permission.ASSIGN_USERS_TO_TEAMS,
    Permission.SHARE_SKILLS_WITH_ORG,
  ],
  [UserRole.USER]: [Permission.MANAGE_SKILLS],
};

function createUseCase() {
  const userContext: Record<string, unknown> = {
    userId: randomUUID(),
    orgId,
    role: UserRole.USER,
    systemRole: SystemRole.CUSTOMER,
  };
  const getTeam = { execute: jest.fn().mockResolvedValue({ id: teamId }) };
  const getMyPermissions = {
    execute: jest.fn((query: GetMyPermissionsQuery) =>
      Promise.resolve(MATRIX[query.role]),
    ),
  };
  const useCase = new GetTeamRolePermissionsUseCase(
    getTeam as unknown as GetTeamUseCase,
    getMyPermissions as unknown as GetMyPermissionsUseCase,
    {
      get: jest.fn((key: string) => userContext[key]),
    } as unknown as ContextService,
  );
  return { useCase, getTeam };
}

describe(GetTeamRolePermissionsUseCase.name, () => {
  it('returns the team-scoped part of each role row of the matrix', async () => {
    const { useCase } = createUseCase();

    const result = await useCase.execute(
      new GetTeamRolePermissionsQuery(teamId),
    );

    expect(result).toEqual([
      { role: UserRole.USER, permissions: [] },
      {
        role: UserRole.MANAGER,
        permissions: [Permission.ASSIGN_USERS_TO_TEAMS],
      },
      {
        role: UserRole.ADMIN,
        permissions: [
          Permission.MANAGE_TEAMS,
          Permission.ASSIGN_USERS_TO_TEAMS,
          Permission.SHARE_SKILLS_WITH_TEAMS,
          Permission.SHARE_KNOWLEDGE_BASES_WITH_TEAMS,
          Permission.MANAGE_TEAM_RECORDINGS,
        ],
      },
    ]);
  });

  it('rejects a team outside the organisation', async () => {
    const { useCase, getTeam } = createUseCase();
    getTeam.execute.mockRejectedValue(new TeamNotFoundError(teamId));

    await expect(
      useCase.execute(new GetTeamRolePermissionsQuery(teamId)),
    ).rejects.toThrow(TeamNotFoundError);
  });
});
