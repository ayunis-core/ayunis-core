import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import { IsNull } from 'typeorm';
import { PendingInviteCountsRepository } from 'src/iam/invites/application/ports/pending-invite-counts.repository';
import { InviteRecord } from 'src/iam/invites/infrastructure/persistence/local/schema/invite.record';

@Injectable()
export class LocalPendingInviteCountsRepository extends PendingInviteCountsRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  countByOrgId(orgId: UUID): Promise<number> {
    return this.txHost.tx
      .getRepository(InviteRecord)
      .count({ where: { orgId, acceptedAt: IsNull() } });
  }
}
