import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import {
  UserUnauthorizedError,
  UserUnexpectedError,
} from 'src/iam/users/application/users.errors';
import { SuperAdminUserListItem } from 'src/iam/users/domain/super-admin-user-list-item';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { SuperAdminFindAllUsersQuery } from './super-admin-find-all-users.query';

@Injectable()
export class SuperAdminFindAllUsersUseCase {
  private readonly logger = new Logger(SuperAdminFindAllUsersUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(
    query: SuperAdminFindAllUsersQuery,
  ): Promise<Paginated<SuperAdminUserListItem>> {
    this.logger.log(
      {
        limit: query.limit,
        offset: query.offset,
        hasSearch: query.search !== undefined,
      },
      'superAdminFindAllUsers',
    );

    if (this.contextService.get('systemRole') !== SystemRole.SUPER_ADMIN) {
      throw new UserUnauthorizedError('Super admin privileges required');
    }

    return this.usersRepository.findAllForSuperAdmin(
      { limit: query.limit, offset: query.offset },
      { search: query.search },
    );
  }
}
