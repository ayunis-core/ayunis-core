import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UserCountsRepository } from 'src/iam/users/application/ports/user-counts.repository';
import { UserUnexpectedError } from 'src/iam/users/application/users.errors';
import { CountUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/count-users-by-org-id/count-users-by-org-id.query';

@Injectable()
export class CountUsersByOrgIdUseCase {
  private readonly logger = new Logger(CountUsersByOrgIdUseCase.name);

  constructor(private readonly counts: UserCountsRepository) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  execute(query: CountUsersByOrgIdQuery): Promise<number> {
    this.logger.log('Counting organization users', { orgId: query.orgId });
    return this.counts.countByOrgId(query.orgId);
  }
}
