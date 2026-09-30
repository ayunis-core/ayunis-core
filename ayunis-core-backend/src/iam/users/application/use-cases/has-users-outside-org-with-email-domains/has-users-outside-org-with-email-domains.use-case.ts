import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { UserUnexpectedError } from 'src/iam/users/application/users.errors';
import type { HasUsersOutsideOrgWithEmailDomainsQuery } from './has-users-outside-org-with-email-domains.query';

@Injectable()
export class HasUsersOutsideOrgWithEmailDomainsUseCase {
  private readonly logger = new Logger(
    HasUsersOutsideOrgWithEmailDomainsUseCase.name,
  );

  constructor(private readonly users: UsersRepository) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  execute(query: HasUsersOutsideOrgWithEmailDomainsQuery): Promise<boolean> {
    this.logger.log(
      { orgId: query.orgId },
      'Checking email domain account ownership',
    );
    return this.users.hasUsersOutsideOrgWithEmailDomains(
      query.orgId,
      query.emailDomains,
    );
  }
}
