import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import { ExternalSubscriptionRevision } from 'src/integrations/external-subscriptions/application/ports/external-subscription-revision';
import { ExternalSubscriptionRevisionRecord } from './schema/external-subscription-revision.record';

@Injectable()
export class PostgresExternalSubscriptionRevision extends ExternalSubscriptionRevision {
  constructor(
    private readonly host: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  async observe(orgId: UUID): Promise<UUID> {
    const records = this.host.tx.getRepository(
      ExternalSubscriptionRevisionRecord,
    );
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
      .getRepository(ExternalSubscriptionRevisionRecord)
      .upsert({ orgId, revision }, ['orgId']);
    return revision;
  }

  async isCurrent(orgId: UUID, revision: UUID): Promise<boolean> {
    await this.host.tx.query("SET LOCAL statement_timeout = '5000ms'");
    const current = await this.host.tx
      .getRepository(ExternalSubscriptionRevisionRecord)
      .findOne({
        where: { orgId },
        lock: { mode: 'pessimistic_write' },
      });
    return current?.revision === revision;
  }
}
