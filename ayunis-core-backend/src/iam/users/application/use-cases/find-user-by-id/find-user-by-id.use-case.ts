import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { FindUserByIdQuery } from './find-user-by-id.query';
import { User } from '../../../domain/user.entity';

@Injectable()
export class FindUserByIdUseCase {
  private readonly logger = new Logger(FindUserByIdUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(query: FindUserByIdQuery): Promise<User> {
    this.logger.log('findOneById', { id: query.id });
    return this.usersRepository.findOneById(query.id);
  }
}
