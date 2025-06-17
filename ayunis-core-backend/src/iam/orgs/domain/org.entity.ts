import { User } from 'src/iam/users/domain/user.entity';
import { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class Org {
  public id: UUID;
  public name: string;
  public users: User[];

  constructor(params: { id?: UUID; name: string; users?: User[] }) {
    this.id = params.id ?? randomUUID();
    this.name = params.name;
    this.users = params.users ?? [];
  }
}
