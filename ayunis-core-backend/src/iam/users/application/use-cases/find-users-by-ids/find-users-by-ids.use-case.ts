import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { FindUsersByIdsQuery } from './find-users-by-ids.query';
import { User } from '../../../domain/user.entity';
import { UserError, UserUnexpectedError } from '../../users.errors';

@Injectable()
export class FindUsersByIdsUseCase {
  private readonly logger = new Logger(FindUsersByIdsUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(query: FindUsersByIdsQuery): Promise<User[]> {
    this.logger.log('findManyByIds', { idCount: query.ids.length });
    try {
      return await this.usersRepository.findManyByIds(query.ids);
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserUnexpectedError(error as Error);
    }
  }
}
