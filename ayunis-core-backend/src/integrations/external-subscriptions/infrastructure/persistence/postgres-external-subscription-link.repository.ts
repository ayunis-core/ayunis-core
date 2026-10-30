import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import {
  ExternalSubscriptionLinkRepository,
  type ExternalSubscriptionLink,
} from 'src/integrations/external-subscriptions/application/ports/external-subscription-link.repository';
import { ExternalSubscriptionLinkRecord } from './schema/external-subscription-link.record';

@Injectable()
export class PostgresExternalSubscriptionLinkRepository extends ExternalSubscriptionLinkRepository {
  constructor(
    private readonly host: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get records() {
    return this.host.tx.getRepository(ExternalSubscriptionLinkRecord);
  }

  async findAll(ownerId?: string): Promise<ExternalSubscriptionLink[]> {
    return this.records.find({ where: ownerId ? { ownerId } : {} });
  }

  async findByOrgId(orgId: UUID): Promise<ExternalSubscriptionLink | null> {
    return this.records.findOneBy({ orgId });
  }

  async save(link: ExternalSubscriptionLink): Promise<void> {
    await this.records.upsert(link, ['orgId']);
  }

  async delete(orgId: UUID): Promise<void> {
    await this.records.delete({ orgId });
  }
}
