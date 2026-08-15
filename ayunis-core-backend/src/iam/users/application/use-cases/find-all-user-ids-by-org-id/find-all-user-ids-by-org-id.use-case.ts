import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UUID } from 'crypto';
import { UsersRepository } from '../../ports/users.repository';
import { FindAllUserIdsByOrgIdQuery } from './find-all-user-ids-by-org-id.query';

/**
 * Use case for retrieving all user IDs belonging to an organization.
 * Returns all IDs without pagination, intended for internal batch operations.
 */
@Injectable()
export class FindAllUserIdsByOrgIdUseCase {
  constructor(
    @InjectPinoLogger(FindAllUserIdsByOrgIdUseCase.name)
    private readonly logger: PinoLogger,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(query: FindAllUserIdsByOrgIdQuery): Promise<UUID[]> {
    this.logger.info({ orgId: query.orgId }, 'execute');
    return this.usersRepository.findAllIdsByOrgId(query.orgId);
  }
}
