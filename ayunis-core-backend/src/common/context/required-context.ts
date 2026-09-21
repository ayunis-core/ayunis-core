import type { UUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { ContextService } from 'src/common/context/services/context.service';

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
