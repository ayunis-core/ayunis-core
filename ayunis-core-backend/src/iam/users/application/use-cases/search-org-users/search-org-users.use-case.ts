import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { SortOrder } from 'src/common/sorting/sort';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { UserUnexpectedError } from 'src/iam/users/application/users.errors';
import type { User } from 'src/iam/users/domain/user.entity';
import { OrgUsersSortField } from 'src/iam/users/domain/value-objects/org-users-sort.enum';
import { SearchOrgUsersQuery } from './search-org-users.query';

/**
 * Searches the caller's organization by name or email without an org-level
 * permission check: the calling module authorizes, e.g. a workspace member
 * picker that needs `manage_workspace_members` in that workspace.
 */
@Injectable()
export class SearchOrgUsersUseCase {
  private readonly logger = new Logger(SearchOrgUsersUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(query: SearchOrgUsersQuery): Promise<User[]> {
    const { orgId } = getRequiredUserContext(this.contextService);
    this.logger.log(
      {
        orgId,
        limit: query.limit,
        excluded: query.excludeIds.length,
        hasSearch: query.search !== undefined,
      },
      'Searching organization users',
    );

    const users = await this.usersRepository.findManyByOrgId(
      orgId,
      { limit: query.limit, offset: 0 },
      { search: query.search, excludeIds: query.excludeIds },
      { field: OrgUsersSortField.NAME, order: SortOrder.ASC },
    );
    return users.data;
  }
}
