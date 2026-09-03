import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { UserSummary } from 'src/iam/users/domain/user-summary';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { UserUnexpectedError } from 'src/iam/users/application/users.errors';
import { FindAllUserSummariesByOrgIdQuery } from './find-all-user-summaries-by-org-id.query';

/**
 * Every member of an org as id + name + email, unpaginated, for listings that
 * label people rather than act on them. An optional search narrows the list on
 * name and email in SQL, so callers that only filter on those fields do not
 * have to load the whole org to do it.
 *
 * Like `FindAllUserIdsByOrgIdUseCase` this is an internal batch read with no
 * permission check of its own — callers pass the org they are already scoped to
 * and their presenter enforces the role.
 */
@Injectable()
export class FindAllUserSummariesByOrgIdUseCase {
  private readonly logger = new Logger(FindAllUserSummariesByOrgIdUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(
    query: FindAllUserSummariesByOrgIdQuery,
  ): Promise<UserSummary[]> {
    this.logger.log({ orgId: query.orgId }, 'execute');
    return this.usersRepository.findAllSummariesByOrgId(query.orgId, {
      search: query.search,
    });
  }
}
