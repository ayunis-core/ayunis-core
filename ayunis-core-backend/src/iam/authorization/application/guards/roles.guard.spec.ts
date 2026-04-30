import type { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { ActiveApiKey } from 'src/iam/authentication/domain/active-api-key.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

import { RolesGuard } from './roles.guard';

const buildContext = (request: { user?: unknown }): ExecutionContext =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as unknown as ExecutionContext;

const orgId = randomUUID();

const buildUser = (role: UserRole): ActiveUser =>
  new ActiveUser({
    id: randomUUID(),
    email: 'admin@example.com',
    emailVerified: true,
    name: 'Admin',
    orgId,
    role,
    systemRole: SystemRole.CUSTOMER,
  });

const buildApiKey = (): ActiveApiKey =>
  new ActiveApiKey({
    apiKeyId: randomUUID(),
    label: 'ci-bot',
    orgId,
  });

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new RolesGuard(reflector);
  });

  it('returns true when no @Roles metadata is set on the route', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(buildContext({}))).toBe(true);
  });

  it('returns false when there is no authenticated principal', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(buildContext({}))).toBe(false);
  });

  it('returns true for a user principal whose role matches', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(
      guard.canActivate(buildContext({ user: buildUser(UserRole.ADMIN) })),
    ).toBe(true);
  });

  it('returns false for a user principal whose role does not match', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(
      guard.canActivate(buildContext({ user: buildUser(UserRole.USER) })),
    ).toBe(false);
  });

  it('returns false for an api-key principal regardless of the required role', () => {
    // Pin the security invariant: roles are a user concept, so api keys must
    // never satisfy @Roles(...). The kind discriminator gates the check;
    // ActiveApiKey structurally cannot carry a role.
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(buildContext({ user: buildApiKey() }))).toBe(
      false,
    );
  });
});
