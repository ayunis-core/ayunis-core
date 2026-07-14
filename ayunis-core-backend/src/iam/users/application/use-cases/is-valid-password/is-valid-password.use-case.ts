import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UserUnexpectedError } from 'src/iam/users/application/users.errors';
import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { IsValidPasswordQuery } from './is-valid-password.query';

@Injectable()
export class IsValidPasswordUseCase {
  private readonly logger = new Logger(IsValidPasswordUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(query: IsValidPasswordQuery): Promise<boolean> {
    return this.usersRepository.isValidPassword(query.password);
  }
}
