import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { FindUsersByIdsQuery } from './find-users-by-ids.query';
import { User } from '../../../domain/user.entity';
import { UserError, UserUnexpectedError } from '../../users.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class FindUsersByIdsUseCase {
  private readonly logger = new Logger(FindUsersByIdsUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindUsersByIdsQuery): Promise<User[]> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('execute', { idCount: query.ids.length, orgId });

    try {
      return await this.usersRepository.findManyByIdsAndOrgId(query.ids, orgId);
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      throw new UserUnexpectedError(error as Error);
    }
  }
}
