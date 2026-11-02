import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import {
  SubscriptionSyncLinkRepository,
  type SubscriptionSyncLink,
} from 'src/integrations/core-connect/subscription-sync/application/ports/subscription-sync-link.repository';
import { SubscriptionSyncLinkRecord } from './schema/subscription-sync-link.record';

@Injectable()
export class PostgresSubscriptionSyncLinkRepository extends SubscriptionSyncLinkRepository {
  constructor(
    private readonly host: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get records() {
    return this.host.tx.getRepository(SubscriptionSyncLinkRecord);
  }

  async findAll(ownerId?: string): Promise<SubscriptionSyncLink[]> {
    return this.records.find({ where: ownerId ? { ownerId } : {} });
  }

  async findByOrgId(orgId: UUID): Promise<SubscriptionSyncLink | null> {
    return this.records.findOneBy({ orgId });
  }

  async save(link: SubscriptionSyncLink): Promise<void> {
    await this.records.upsert(link, ['orgId']);
  }

  async delete(orgId: UUID): Promise<void> {
    await this.records.delete({ orgId });
  }
}
