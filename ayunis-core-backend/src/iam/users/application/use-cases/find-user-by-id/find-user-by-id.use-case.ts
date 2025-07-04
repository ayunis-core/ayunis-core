import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { FindUserByIdQuery } from './find-user-by-id.query';
import { User } from '../../../domain/user.entity';
import {
  UserError,
  UserNotFoundError,
  UserUnexpectedError,
} from '../../users.errors';

@Injectable()
export class FindUserByIdUseCase {
  private readonly logger = new Logger(FindUserByIdUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(query: FindUserByIdQuery): Promise<User> {
    this.logger.log('findOneById', { id: query.id });
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
      throw new UserUnexpectedError(error);
    }
  }
}
