import { User } from 'src/iam/users/domain/user.entity';
import { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class Org {
  public id: UUID;
  public name: string;
  public users: User[];
  public createdAt: Date;
  public updatedAt: Date;

  constructor(params: {
    id?: UUID;
    name: string;
    users?: User[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.name = params.name;
    this.users = params.users ?? [];
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
