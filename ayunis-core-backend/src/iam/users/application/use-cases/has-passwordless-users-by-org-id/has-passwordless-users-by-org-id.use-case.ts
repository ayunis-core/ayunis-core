import { Injectable } from '@nestjs/common';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import type { HasPasswordlessUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/has-passwordless-users-by-org-id/has-passwordless-users-by-org-id.query';

@Injectable()
export class HasPasswordlessUsersByOrgIdUseCase {
  constructor(private readonly users: UsersRepository) {}

  execute(query: HasPasswordlessUsersByOrgIdQuery): Promise<boolean> {
    return this.users.hasPasswordlessUsers(query.orgId);
  }
}
