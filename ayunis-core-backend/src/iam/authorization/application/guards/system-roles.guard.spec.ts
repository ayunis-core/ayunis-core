import type { ExecutionContext } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRolesGuard } from './system-roles.guard';
import { SYSTEM_ROLES_KEY } from '../decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';

function createContext(overrides: {
  roles?: SystemRole[];
  user?: Partial<ActiveUser>;
  method?: string;
  url?: string;
  ip?: string;
}): { context: ExecutionContext; reflector: Reflector } {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
    if (key === SYSTEM_ROLES_KEY) return overrides.roles;
    return undefined;
  });

  const request = {
    user: overrides.user,
    method: overrides.method ?? 'GET',
    url: overrides.url ?? '/api/admin/instance',
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

describe('SystemRolesGuard', () => {
  const superAdmin: Partial<ActiveUser> = {
    id: '11111111-2222-3333-4444-555555555555',
    orgId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    email: 'root@example.gov',
    systemRole: SystemRole.SUPER_ADMIN,
  };

  const customer: Partial<ActiveUser> = {
    ...superAdmin,
    email: 'customer@example.gov',
    systemRole: SystemRole.CUSTOMER,
  };

  it('should allow access when no system-roles metadata is set on the route', () => {
    const { context, reflector } = createContext({ roles: undefined });
    const guard = new SystemRolesGuard(reflector);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when the user has the required system role', () => {
    const { context, reflector } = createContext({
      roles: [SystemRole.SUPER_ADMIN],
      user: superAdmin,
    });
    const guard = new SystemRolesGuard(reflector);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when the user lacks the required system role', () => {
    const { context, reflector } = createContext({
      roles: [SystemRole.SUPER_ADMIN],
      user: customer,
    });
    const guard = new SystemRolesGuard(reflector);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('should log a warning with audit context when the system role is rejected', () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const { context, reflector } = createContext({
      roles: [SystemRole.SUPER_ADMIN],
      user: customer,
      method: 'POST',
      url: '/api/admin/instance/config',
      ip: '203.0.113.9',
    });
    const guard = new SystemRolesGuard(reflector);

    guard.canActivate(context);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [message, meta] = warnSpy.mock.calls[0];
    expect(message).toMatch(/role/i);
    expect(meta).toEqual(
      expect.objectContaining({
        userId: customer.id,
        orgId: customer.orgId,
        userSystemRole: SystemRole.CUSTOMER,
        requiredSystemRoles: [SystemRole.SUPER_ADMIN],
        method: 'POST',
        path: '/api/admin/instance/config',
        clientIp: '203.0.113.9',
      }),
    );

    warnSpy.mockRestore();
  });

  it('should log a warning when no authenticated user is present', () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const { context, reflector } = createContext({
      roles: [SystemRole.SUPER_ADMIN],
      user: undefined,
    });
    const guard = new SystemRolesGuard(reflector);

    const result = guard.canActivate(context);

    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });
});
