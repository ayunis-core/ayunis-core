import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { UnauthorizedSubscriptionAccessError } from 'src/iam/subscriptions/application/subscription.errors';
import {
  getUserContext,
  isSuperAdmin,
} from 'src/common/context/required-context';

export function validateSubscriptionAccess(
  contextService: ContextService,
  requestingUserId: UUID,
  targetOrgId: UUID,
): void {
  const principal = getUserContext(contextService);
  const callerIsSuperAdmin = isSuperAdmin(contextService);
  const isOrgAdmin =
    principal?.role === UserRole.ADMIN && principal.orgId === targetOrgId;
  if (!callerIsSuperAdmin && !isOrgAdmin) {
    throw new UnauthorizedSubscriptionAccessError(
      requestingUserId,
      targetOrgId,
    );
  }
}
