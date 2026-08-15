import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { IsValidPasswordQuery } from './is-valid-password.query';

@Injectable()
export class IsValidPasswordUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(query: IsValidPasswordQuery): Promise<boolean> {
    return this.usersRepository.isValidPassword(query.password);
  }
}
