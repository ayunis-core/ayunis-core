import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { FindUserByIdQuery } from './find-user-by-id.query';
import { User } from 'src/iam/users/domain/user.entity';
import {
  UserError,
  UserNotFoundError,
  UserUnexpectedError,
} from 'src/iam/users/application/users.errors';

@Injectable()
export class FindUserByIdUseCase {
  private readonly logger = new Logger(FindUserByIdUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(query: FindUserByIdQuery): Promise<User> {
    this.logger.log({ id: query.id }, 'findOneById');
    try {
      const user = await this.usersRepository.findOneById(query.id);
      if (!user) {
        throw new UserNotFoundError(query.id);
      }
      return user;
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserUnexpectedError(error as Error);
    }
  }
}
