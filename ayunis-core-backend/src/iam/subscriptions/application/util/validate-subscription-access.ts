import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { UnauthorizedSubscriptionAccessError } from 'src/iam/subscriptions/application/subscription.errors';
import { getUserContext } from 'src/common/context/required-context';

export function validateSubscriptionAccess(
  contextService: ContextService,
  requestingUserId: UUID,
  targetOrgId: UUID,
): void {
  const principal = getUserContext(contextService);
  const isSuperAdmin = principal?.systemRole === SystemRole.SUPER_ADMIN;
  const isOrgAdmin =
    principal?.role === UserRole.ADMIN && principal.orgId === targetOrgId;
  if (!isSuperAdmin && !isOrgAdmin) {
    throw new UnauthorizedSubscriptionAccessError(
      requestingUserId,
      targetOrgId,
    );
  }
}
