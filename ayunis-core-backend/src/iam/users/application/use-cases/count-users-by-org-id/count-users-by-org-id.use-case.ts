import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UserCountsRepository } from 'src/iam/users/application/ports/user-counts.repository';
import { UserUnexpectedError } from 'src/iam/users/application/users.errors';
import { CountUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/count-users-by-org-id/count-users-by-org-id.query';

@Injectable()
export class CountUsersByOrgIdUseCase {
  constructor(
    @InjectPinoLogger(CountUsersByOrgIdUseCase.name)
    private readonly logger: PinoLogger,
    private readonly counts: UserCountsRepository,
  ) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  execute(query: CountUsersByOrgIdQuery): Promise<number> {
    this.logger.info({ orgId: query.orgId }, 'Counting organization users');
    return this.counts.countByOrgId(query.orgId);
  }
}
