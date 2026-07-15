import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UserUnexpectedError } from 'src/iam/users/application/users.errors';
import { Injectable } from '@nestjs/common';
import { FindUserByEmailQuery } from './find-user-by-email.query';
import { User } from 'src/iam/users/domain/user.entity';
import { UsersRepository } from '../../ports/users.repository';

@Injectable()
export class FindUserByEmailUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(query: FindUserByEmailQuery): Promise<User | null> {
    return await this.usersRepository.findOneByEmail(query.email);
  }
}
