import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class WorkspaceMember {
  public readonly id: UUID;
  public readonly workspaceId: UUID;
  public readonly userId: UUID;
  public role: UserRole;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(params: {
    id?: UUID;
    workspaceId: UUID;
    userId: UUID;
    role: UserRole;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.workspaceId = params.workspaceId;
    this.userId = params.userId;
    this.role = params.role;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
