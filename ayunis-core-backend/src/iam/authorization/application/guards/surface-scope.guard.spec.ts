import { createLoggerMock } from 'src/common/testing/logger.mock';
import type { ExecutionContext } from '@nestjs/common';
import { Controller, Get, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UUID } from 'crypto';
import { SurfaceScopeGuard } from './surface-scope.guard';
import {
  RequireSurfaceScope,
  SURFACE_SCOPE_KEY,
} from 'src/iam/authorization/application/decorators/surface-scope.decorator';
import { SurfaceScope } from 'src/config/surface-scope';
import { ClientNotAllowedError } from 'src/iam/authorization/application/authorization.errors';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import type { SessionClient } from 'src/iam/sessions/domain/value-objects/session-client';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

createLoggerMock();

@Controller('fixture')
class FixtureController {
  @RequireSurfaceScope(SurfaceScope.CHAT)
  @Get('marked')
  marked() {}

  @RequireSurfaceScope(SurfaceScope.CHAT)
  @Get('new-chat-operation')
  newChatOperation() {}

  @SetMetadata(SURFACE_SCOPE_KEY, 'ungranted-test-scope')
  @Get('ungranted')
  ungranted() {}

  @Get('unmarked')
  unmarked() {}
}

const STADT_A = '5f0c6a10-1a2b-4c3d-8e4f-000000000001' as UUID;
const STADT_B = '5f0c6a10-1a2b-4c3d-8e4f-000000000002' as UUID;

function principal(
  id: string,
  orgId: UUID,
  client: SessionClient | null,
): ActiveUser {
  return new ActiveUser({
    id: id as UUID,
    email: `${id}@stadt.example`,
    emailVerified: true,
    role: UserRole.USER,
    systemRole: SystemRole.CUSTOMER,
    orgId,
    name: id,
    client,
  });
}

const webUser = principal('web-user', STADT_A, null);
const paneUser = principal('pane-user', STADT_A, 'outlook');
const otherOrgPaneUser = principal('other-pane-user', STADT_B, 'outlook');

function contextFor(
  handler: keyof FixtureController,
  user: ActiveUser | undefined,
): ExecutionContext {
  const request = {
    user,
    method: 'GET',
    url: `/api/fixture/${handler}`,
    socket: {},
  };
  return {
    getHandler: () => FixtureController.prototype[handler],
    getClass: () => FixtureController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe(SurfaceScopeGuard.name, () => {
  const guard = new SurfaceScopeGuard(new Reflector());

  it.each([
    ['a pane user', paneUser],
    ['a pane user of another organisation', otherOrgPaneUser],
  ])('denies %s on a route not marked for the surface', (_case, user) => {
    expect(() => guard.canActivate(contextFor('unmarked', user))).toThrow(
      ClientNotAllowedError,
    );
  });

  it.each([
    ['a pane user', paneUser],
    ['a pane user of another organisation', otherOrgPaneUser],
  ])('allows %s on a route marked for the surface', (_case, user) => {
    expect(guard.canActivate(contextFor('marked', user))).toBe(true);
  });

  it('accepts a new operation that requires a scope already granted to the surface', () => {
    expect(guard.canActivate(contextFor('newChatOperation', paneUser))).toBe(
      true,
    );
  });

  it('denies a route requiring a scope the surface does not have', () => {
    expect(() => guard.canActivate(contextFor('ungranted', paneUser))).toThrow(
      ClientNotAllowedError,
    );
  });

  it.each(['marked', 'ungranted', 'unmarked'] as const)(
    'leaves a browser session of the same organisation untouched on the %s route',
    (handler) => {
      expect(guard.canActivate(contextFor(handler, webUser))).toBe(true);
    },
  );

  it('leaves unauthenticated requests to the other guards', () => {
    expect(guard.canActivate(contextFor('unmarked', undefined))).toBe(true);
  });
});
