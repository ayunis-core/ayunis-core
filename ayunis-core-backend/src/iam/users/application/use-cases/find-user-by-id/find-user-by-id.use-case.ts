import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { FindUserByIdQuery } from './find-user-by-id.query';
import { User } from '../../../domain/user.entity';
import { UserNotFoundError, UserUnexpectedError } from '../../users.errors';

@Injectable()
export class FindUserByIdUseCase {
  private readonly logger = new Logger(FindUserByIdUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(query: FindUserByIdQuery): Promise<User> {
    this.logger.log('findOneById', { id: query.id });

    const user = await this.usersRepository.findOneById(query.id);
    if (!user) {
      throw new UserNotFoundError(query.id);
    }
    return user;
  }
}
