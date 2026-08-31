import type { User } from 'src/iam/users/domain/user.entity';

export type CleanUserData = Pick<
  User,
  | 'id'
  | 'email'
  | 'emailVerified'
  | 'role'
  | 'systemRole'
  | 'orgId'
  | 'name'
  | 'hasAcceptedMarketing'
  | 'department'
  | 'createdAt'
  | 'updatedAt'
> & { passwordHash: '' };

export function cleanUserData(user: User): CleanUserData {
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
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
