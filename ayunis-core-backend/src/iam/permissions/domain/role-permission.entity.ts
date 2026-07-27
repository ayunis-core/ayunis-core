import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { Permission } from './value-objects/permission.enum';

export class RolePermission {
  id: UUID;
  orgId: UUID;
  role: UserRole;
  permission: Permission;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    orgId: UUID;
    role: UserRole;
    permission: Permission;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.role = params.role;
    this.permission = params.permission;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
