import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { FindUsersByOrgIdQuery } from './find-users-by-org-id.query';
import { User } from '../../../domain/user.entity';

@Injectable()
export class FindUsersByOrgIdUseCase {
  private readonly logger = new Logger(FindUsersByOrgIdUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(query: FindUsersByOrgIdQuery): Promise<User[]> {
    this.logger.log('findManyByOrgId', { orgId: query.orgId });
    return this.usersRepository.findManyByOrgId(query.orgId);
  }
}
