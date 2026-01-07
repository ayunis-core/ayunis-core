import { Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { UsersRepository } from '../../ports/users.repository';
import { FindAllUserIdsByOrgIdQuery } from './find-all-user-ids-by-org-id.query';

/**
 * Use case for retrieving all user IDs belonging to an organization.
 * Returns all IDs without pagination, intended for internal batch operations.
 */
@Injectable()
export class FindAllUserIdsByOrgIdUseCase {
  private readonly logger = new Logger(FindAllUserIdsByOrgIdUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(query: FindAllUserIdsByOrgIdQuery): Promise<UUID[]> {
    this.logger.log('execute', { orgId: query.orgId });
    return this.usersRepository.findAllIdsByOrgId(query.orgId);
  }
}
