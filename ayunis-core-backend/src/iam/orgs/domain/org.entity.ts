import type { User } from 'src/iam/users/domain/user.entity';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class Org {
  public id: UUID;
  public name: string;
  public archived: boolean;
  public sessionVersion: number;
  public users: User[];
  public createdAt: Date;
  public updatedAt: Date;

  constructor(params: {
    id?: UUID;
    name: string;
    archived?: boolean;
    sessionVersion?: number;
    users?: User[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.name = params.name;
    this.archived = params.archived ?? false;
    this.sessionVersion = params.sessionVersion ?? 0;
    this.users = params.users ?? [];
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
