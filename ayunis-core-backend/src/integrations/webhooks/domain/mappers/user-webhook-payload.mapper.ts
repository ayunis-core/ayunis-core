import type { UserPayload } from '@ayunis-core/connect-sdk/contracts';
import type { User } from 'src/iam/users/domain/user.entity';

export function mapUserToWebhookPayload(user: User): UserPayload {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    passwordHash: '',
    role: user.role,
    systemRole: user.systemRole,
    orgId: user.orgId,
    name: user.name,
    hasAcceptedMarketing: user.hasAcceptedMarketing,
    department: user.department,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
