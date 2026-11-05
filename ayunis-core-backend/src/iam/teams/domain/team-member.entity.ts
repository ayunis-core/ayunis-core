import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class TeamMember {
  public id: UUID;
  public teamId: UUID;
  public userId: UUID;
  public role: UserRole;
  public user?: User;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(params: {
    id?: UUID;
    teamId: UUID;
    userId: UUID;
    role?: UserRole;
    user?: User;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.teamId = params.teamId;
    this.userId = params.userId;
    this.role = params.role ?? UserRole.USER;
    this.user = params.user;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
