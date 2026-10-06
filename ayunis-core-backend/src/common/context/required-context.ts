import type { UUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';

// Free functions rather than ContextService methods: ContextService is only a
// `useExisting` alias of nestjs-cls' ClsService, so the injected instance is a
// plain ClsService and any method added to the subclass would be undefined at
// runtime. Taking the service as an argument also keeps the existing
// `{ get: jest.fn() }` test doubles working unchanged.

/**
 * Reads the principal of an operation that requires an authenticated human
 * user. Not for API-key requests: those carry `orgId` and `apiKeyId` but
 * intentionally no `userId` — use {@link getRequiredOrgId} there.
 */
export function getRequiredUserContext(context: ContextService): {
  userId: UUID;
  orgId: UUID;
} {
  const userId = context.get('userId');
  const orgId = context.get('orgId');

  if (!userId || !orgId) {
    throw new UnauthorizedAccessError();
  }

  return { userId, orgId };
}

/** Reads the organization of an operation that accepts either principal type. */
export function getRequiredOrgId(context: ContextService): UUID {
  const orgId = context.get('orgId');

  if (!orgId) {
    throw new UnauthorizedAccessError();
  }

  return orgId;
}

export interface UserPrincipal {
  userId: UUID;
  orgId: UUID;
  role: UserRole;
  systemRole: SystemRole;
}

/**
 * The only sanctioned read of `role` / `systemRole` (enforced by ESLint):
 * roles are returned only when the request is backed by a human user, so an
 * API-key or background context can never be mistaken for an admin.
 */
export function getUserPrincipal(
  context: ContextService,
): UserPrincipal | undefined {
  const userId = context.get('userId');
  const orgId = context.get('orgId');
  const role = context.get('role');
  const systemRole = context.get('systemRole');

  if (!userId || !orgId || !role || !systemRole) {
    return undefined;
  }

  return { userId, orgId, role, systemRole };
}

export function getRequiredUserPrincipal(
  context: ContextService,
): UserPrincipal {
  const principal = getUserPrincipal(context);

  if (!principal) {
    throw new UnauthorizedAccessError();
  }

  return principal;
}

export function isSuperAdmin(context: ContextService): boolean {
  return getUserPrincipal(context)?.systemRole === SystemRole.SUPER_ADMIN;
}
