import { UUID, randomUUID } from 'crypto';
import { User } from 'src/iam/users/domain/user.entity';

export class TeamMember {
  public id: UUID;
  public teamId: UUID;
  public userId: UUID;
  public user?: User;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(params: {
    id?: UUID;
    teamId: UUID;
    userId: UUID;
    user?: User;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.teamId = params.teamId;
    this.userId = params.userId;
    this.user = params.user;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
