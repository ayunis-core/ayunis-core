import { Injectable } from '@nestjs/common';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { FindUsersByEmailsQuery } from 'src/iam/users/application/use-cases/find-users-by-emails/find-users-by-emails.query';
import type { User } from 'src/iam/users/domain/user.entity';

@Injectable()
export class FindUsersByEmailsUseCase {
  constructor(private readonly users: UsersRepository) {}

  execute(query: FindUsersByEmailsQuery): Promise<User[]> {
    return this.users.findManyByEmails(query.emails);
  }
}
