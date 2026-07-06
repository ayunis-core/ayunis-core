import type { ExecutionContext } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';

function createContext(overrides: {
  roles?: UserRole[];
  user?: Partial<ActiveUser>;
  method?: string;
  url?: string;
  ip?: string;
}): { context: ExecutionContext; reflector: Reflector } {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
    if (key === ROLES_KEY) return overrides.roles;
    return undefined;
  });

  const request = {
    user: overrides.user,
    method: overrides.method ?? 'GET',
    url: overrides.url ?? '/api/admin/users',
    headers: overrides.ip ? { 'x-forwarded-for': overrides.ip } : {},
    socket: { remoteAddress: overrides.ip },
    ip: overrides.ip,
  };

  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;

  return { context, reflector };
}

describe('RolesGuard', () => {
  const admin: Partial<ActiveUser> = {
    id: '11111111-2222-3333-4444-555555555555',
    orgId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    email: 'admin@example.gov',
    role: UserRole.ADMIN,
  };

  const regularUser: Partial<ActiveUser> = {
    ...admin,
    email: 'user@example.gov',
    role: UserRole.USER,
  };

  it('should allow access when no roles metadata is set on the route', () => {
    const { context, reflector } = createContext({ roles: undefined });
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when the user has one of the required roles', () => {
    const { context, reflector } = createContext({
      roles: [UserRole.ADMIN],
      user: admin,
    });
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when the user does not have a required role', () => {
    const { context, reflector } = createContext({
      roles: [UserRole.ADMIN],
      user: regularUser,
    });
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('should log a warning with audit context when the user role is rejected', () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const { context, reflector } = createContext({
      roles: [UserRole.ADMIN],
      user: regularUser,
      method: 'DELETE',
      url: '/api/admin/users/42',
      ip: '203.0.113.7',
    });
    const guard = new RolesGuard(reflector);

    guard.canActivate(context);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [message, meta] = warnSpy.mock.calls[0];
    expect(message).toMatch(/role/i);
    expect(meta).toEqual(
      expect.objectContaining({
        userId: regularUser.id,
        orgId: regularUser.orgId,
        userRole: UserRole.USER,
        requiredRoles: [UserRole.ADMIN],
        method: 'DELETE',
        path: '/api/admin/users/42',
        clientIp: '203.0.113.7',
      }),
    );

    warnSpy.mockRestore();
  });
});
