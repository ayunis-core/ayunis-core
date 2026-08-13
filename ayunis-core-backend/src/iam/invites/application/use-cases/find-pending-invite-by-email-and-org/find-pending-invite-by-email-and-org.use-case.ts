import { Injectable } from '@nestjs/common';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { FindPendingInviteByEmailAndOrgQuery } from 'src/iam/invites/application/use-cases/find-pending-invite-by-email-and-org/find-pending-invite-by-email-and-org.query';
import type { Invite } from 'src/iam/invites/domain/invite.entity';

@Injectable()
export class FindPendingInviteByEmailAndOrgUseCase {
  constructor(private readonly invites: InvitesRepository) {}

  execute(query: FindPendingInviteByEmailAndOrgQuery): Promise<Invite | null> {
    return this.invites.findOneByEmailAndOrg(query.email, query.orgId);
  }
}
