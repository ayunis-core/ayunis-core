import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import { FynnSyncRevision } from 'src/integrations/fynn/application/ports/fynn-sync-revision';
import { FynnSyncRevisionRecord } from './schema/fynn-sync-revision.record';

@Injectable()
export class PostgresFynnSyncRevision extends FynnSyncRevision {
  constructor(
    private readonly host: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  async observe(orgId: UUID): Promise<UUID> {
    const records = this.host.tx.getRepository(FynnSyncRevisionRecord);
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
      .getRepository(FynnSyncRevisionRecord)
      .upsert({ orgId, revision }, ['orgId']);
    return revision;
  }

  async isCurrent(orgId: UUID, revision: UUID): Promise<boolean> {
    await this.host.tx.query("SET LOCAL statement_timeout = '5000ms'");
    const current = await this.host.tx
      .getRepository(FynnSyncRevisionRecord)
      .findOne({
        where: { orgId },
        lock: { mode: 'pessimistic_write' },
      });
    return current?.revision === revision;
  }
}
