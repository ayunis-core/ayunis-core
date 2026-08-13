import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import { UserCountsRepository } from 'src/iam/users/application/ports/user-counts.repository';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

@Injectable()
export class LocalUserCountsRepository extends UserCountsRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  countByOrgId(orgId: UUID): Promise<number> {
    return this.txHost.tx.getRepository(UserRecord).count({ where: { orgId } });
  }
}
