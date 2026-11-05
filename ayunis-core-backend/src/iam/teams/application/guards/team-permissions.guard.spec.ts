import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { randomUUID } from 'crypto';
import { TeamPermissionsGuard } from './team-permissions.guard';
import { REQUIRE_TEAM_PERMISSION_KEY } from 'src/iam/teams/application/decorators/team-permissions.decorator';
import { TeamAccess } from 'src/iam/teams/application/models/team-access.model';
import type { GetTeamAccessUseCase } from 'src/iam/teams/application/use-cases/get-team-access/get-team-access.use-case';
import type { GetTeamAccessQuery } from 'src/iam/teams/application/use-cases/get-team-access/get-team-access.query';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

const teamId = randomUUID();
const user = { id: randomUUID(), orgId: randomUUID(), role: UserRole.USER };

function createGuard(options: {
  required?: Permission[];
  teamPermissions?: Permission[];
  user?: object;
  teamIdParam?: string;
}) {
  const reflector = new Reflector();
  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockImplementation((key) =>
      key === REQUIRE_TEAM_PERMISSION_KEY ? options.required : undefined,
    );
  const execute = jest.fn<Promise<TeamAccess>, [GetTeamAccessQuery]>(() =>
    Promise.resolve(
      new TeamAccess({
        teamRole: UserRole.MANAGER,
        orgPermissions: [],
        teamPermissions: options.teamPermissions ?? [],
      }),
    ),
  );
  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        user: options.user,
        params: { id: options.teamIdParam ?? teamId },
        method: 'POST',
        url: `/api/teams/${teamId}/members`,
        headers: {},
        socket: {},
      }),
    }),
  } as unknown as ExecutionContext;
  const guard = new TeamPermissionsGuard(reflector, {
    execute,
  } as unknown as GetTeamAccessUseCase);
  return { guard, context, execute };
}

describe(TeamPermissionsGuard.name, () => {
  afterEach(() => jest.restoreAllMocks());

  it('allows a route without team permission metadata', async () => {
    const { guard, context, execute } = createGuard({ user });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(execute).not.toHaveBeenCalled();
  });

  it('resolves access for the path team and the request user', async () => {
    const { guard, context, execute } = createGuard({
      user,
      required: [Permission.ASSIGN_USERS_TO_TEAMS],
      teamPermissions: [Permission.ASSIGN_USERS_TO_TEAMS],
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(execute.mock.calls[0][0]).toEqual({
      principal: { userId: user.id, orgId: user.orgId, role: user.role },
      teamId,
    });
  });

  it('denies when the team access lacks every required permission', async () => {
    const { guard, context } = createGuard({
      user,
      required: [Permission.MANAGE_TEAMS, Permission.ASSIGN_USERS_TO_TEAMS],
      teamPermissions: [Permission.SHARE_SKILLS_WITH_TEAMS],
    });

    await expect(guard.canActivate(context)).resolves.toBe(false);
  });

  it.each([
    ['no principal', undefined],
    ['an api-key principal', { orgId: user.orgId, apiKeyId: randomUUID() }],
  ])('denies %s without resolving access', async (_label, principal) => {
    const { guard, context, execute } = createGuard({
      user: principal,
      required: [Permission.ASSIGN_USERS_TO_TEAMS],
    });

    await expect(guard.canActivate(context)).resolves.toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });

  it('denies a malformed team id without resolving access', async () => {
    const { guard, context, execute } = createGuard({
      user,
      required: [Permission.ASSIGN_USERS_TO_TEAMS],
      teamIdParam: 'not-a-uuid',
    });

    await expect(guard.canActivate(context)).resolves.toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });
});
