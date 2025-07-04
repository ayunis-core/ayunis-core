import { Injectable } from '@nestjs/common';
import { IsFromOrgQuery } from './is-from-org.query';
import { UsersRepository } from '../../ports/users.repository';

@Injectable()
export class IsFromOrgUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(query: IsFromOrgQuery): Promise<boolean> {
    const user = await this.usersRepository.findOneById(query.userId);
    if (!user) {
      return false;
    }

    return user.orgId === query.orgId;
  }
}
