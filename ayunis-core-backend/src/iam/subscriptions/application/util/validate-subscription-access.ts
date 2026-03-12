import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { UnauthorizedSubscriptionAccessError } from '../subscription.errors';

export function validateSubscriptionAccess(
  contextService: ContextService,
  requestingUserId: UUID,
  targetOrgId: UUID,
): void {
  const systemRole = contextService.get('systemRole');
  const orgRole = contextService.get('role');
  const orgId = contextService.get('orgId');
  const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
  const isOrgAdmin = orgRole === UserRole.ADMIN && orgId === targetOrgId;
  if (!isSuperAdmin && !isOrgAdmin) {
    throw new UnauthorizedSubscriptionAccessError(
      requestingUserId,
      targetOrgId,
    );
  }
}
