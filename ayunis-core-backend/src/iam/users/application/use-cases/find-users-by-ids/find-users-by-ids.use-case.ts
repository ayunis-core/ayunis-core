import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { FindUsersByIdsQuery } from './find-users-by-ids.query';
import { User } from '../../../domain/user.entity';
import { UserUnexpectedError } from '../../users.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class FindUsersByIdsUseCase {
  private readonly logger = new Logger(FindUsersByIdsUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(query: FindUsersByIdsQuery): Promise<User[]> {
    const orgId = this.contextService.get('orgId');

    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('execute', { idCount: query.ids.length, orgId });

    return await this.usersRepository.findManyByIdsAndOrgId(query.ids, orgId);
  }
}
