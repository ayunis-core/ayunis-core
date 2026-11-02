import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import { SubscriptionSyncRevision } from 'src/integrations/core-connect/subscription-sync/application/ports/subscription-sync-revision';
import { SubscriptionSyncRevisionRecord } from './schema/subscription-sync-revision.record';

@Injectable()
export class PostgresSubscriptionSyncRevision extends SubscriptionSyncRevision {
  constructor(
    private readonly host: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  async observe(orgId: UUID): Promise<UUID> {
    const records = this.host.tx.getRepository(SubscriptionSyncRevisionRecord);
    await records
      .createQueryBuilder()
      .insert()
      .values({ orgId, revision: randomUUID() })
      .orIgnore()
      .execute();
    const current = await records.findOneByOrFail({ orgId });
    return current.revision;
  }

  async begin(orgId: UUID): Promise<UUID> {
    const revision = randomUUID();
    await this.host.tx
      .getRepository(SubscriptionSyncRevisionRecord)
      .upsert({ orgId, revision }, ['orgId']);
    return revision;
  }

  async isCurrent(orgId: UUID, revision: UUID): Promise<boolean> {
    // Bounds the wait for the revision row. SET LOCAL lasts until the
    // transaction ends, so later lock waits in this sync share the bound.
    await this.host.tx.query("SET LOCAL lock_timeout = '5000ms'");
    const current = await this.host.tx
      .getRepository(SubscriptionSyncRevisionRecord)
      .findOne({
        where: { orgId },
        lock: { mode: 'pessimistic_write' },
      });
    return current?.revision === revision;
  }
}
