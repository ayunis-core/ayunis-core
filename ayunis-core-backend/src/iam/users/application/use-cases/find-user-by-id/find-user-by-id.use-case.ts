import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UsersRepository } from '../../ports/users.repository';
import { FindUserByIdQuery } from './find-user-by-id.query';
import { User } from 'src/iam/users/domain/user.entity';
import {
  UserError,
  UserNotFoundError,
  UserUnexpectedError,
} from '../../users.errors';

@Injectable()
export class FindUserByIdUseCase {
  constructor(
    @InjectPinoLogger(FindUserByIdUseCase.name)
    private readonly logger: PinoLogger,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(query: FindUserByIdQuery): Promise<User> {
    this.logger.info({ id: query.id }, 'findOneById');
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
