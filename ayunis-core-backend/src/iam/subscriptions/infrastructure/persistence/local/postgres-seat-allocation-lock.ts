import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import { SeatAllocationLock } from 'src/iam/subscriptions/application/ports/seat-allocation-lock';

@Injectable()
export class PostgresSeatAllocationLock extends SeatAllocationLock {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  async acquire(orgId: UUID): Promise<void> {
    await this.txHost.tx.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [orgId],
    );
  }
}
