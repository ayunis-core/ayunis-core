import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { PendingInviteCountsRepository } from 'src/iam/invites/application/ports/pending-invite-counts.repository';
import { UnexpectedInviteError } from 'src/iam/invites/application/invites.errors';
import { CountPendingInvitesByOrgIdQuery } from 'src/iam/invites/application/use-cases/count-pending-invites-by-org-id/count-pending-invites-by-org-id.query';

@Injectable()
export class CountPendingInvitesByOrgIdUseCase {
  constructor(
    @InjectPinoLogger(CountPendingInvitesByOrgIdUseCase.name)
    private readonly logger: PinoLogger,
    private readonly counts: PendingInviteCountsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedInviteError)
  execute(query: CountPendingInvitesByOrgIdQuery): Promise<number> {
    this.logger.info(
      { orgId: query.orgId },
      'Counting pending organization invitations',
    );
    return this.counts.countByOrgId(query.orgId);
  }
}
