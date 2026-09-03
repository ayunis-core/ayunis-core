import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { REQUIRE_PERMISSION_KEY } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import type { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';

const manager: Partial<ActiveUser> = {
  id: '11111111-2222-3333-4444-555555555555',
  orgId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  email: 'manager@example.gov',
  role: UserRole.MANAGER,
};

function createGuard(options: {
  required?: Permission[];
  granted?: Permission[];
  user?: Partial<ActiveUser>;
}) {
  const reflector = new Reflector();
  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockImplementation((key) =>
      key === REQUIRE_PERMISSION_KEY ? options.required : undefined,
    );

  const execute = jest.fn((query: { permission: Permission }) =>
    Promise.resolve((options.granted ?? []).includes(query.permission)),
  );

  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        user: options.user,
        method: 'GET',
        url: '/api/teams',
        headers: {},
        socket: {},
      }),
    }),
  } as unknown as ExecutionContext;

  const guard = new PermissionsGuard(reflector, {
    execute,
  } as unknown as HasPermissionUseCase);

  return { guard, context, execute };
}

describe('PermissionsGuard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows a route with no permission metadata', async () => {
    const { guard, context } = createGuard({ required: undefined });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('allows a route whose metadata is an empty permission list', async () => {
    const { guard, context } = createGuard({ required: [] });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('denies a request without a principal', async () => {
    const { guard, context } = createGuard({
      required: [Permission.MANAGE_TEAMS],
      user: undefined,
    });

    await expect(guard.canActivate(context)).resolves.toBe(false);
  });

  it('allows the holder of the single required permission', async () => {
    const { guard, context } = createGuard({
      required: [Permission.MANAGE_TEAMS],
      granted: [Permission.MANAGE_TEAMS],
      user: manager,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('allows a holder of any one of several required permissions', async () => {
    const { guard, context } = createGuard({
      required: [Permission.MANAGE_TEAMS, Permission.ASSIGN_USERS_TO_TEAMS],
      granted: [Permission.ASSIGN_USERS_TO_TEAMS],
      user: manager,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('denies a holder of none of several required permissions', async () => {
    const { guard, context } = createGuard({
      required: [Permission.MANAGE_TEAMS, Permission.ASSIGN_USERS_TO_TEAMS],
      granted: [Permission.MANAGE_SKILLS],
      user: manager,
    });

    await expect(guard.canActivate(context)).resolves.toBe(false);
  });
});
