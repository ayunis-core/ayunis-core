import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import {
  FynnOrgLinkRepository,
  type FynnOrgLink,
} from 'src/integrations/fynn/application/ports/fynn-org-link.repository';
import { FynnOrgLinkRecord } from './schema/fynn-org-link.record';

@Injectable()
export class PostgresFynnOrgLinkRepository extends FynnOrgLinkRepository {
  constructor(
    private readonly host: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get records() {
    return this.host.tx.getRepository(FynnOrgLinkRecord);
  }

  async findAll(customerId?: string): Promise<FynnOrgLink[]> {
    return this.records.find({ where: customerId ? { customerId } : {} });
  }

  async findByOrgId(orgId: UUID): Promise<FynnOrgLink | null> {
    return this.records.findOneBy({ orgId });
  }

  async save(link: FynnOrgLink): Promise<void> {
    await this.records.upsert(link, ['orgId']);
  }

  async delete(orgId: UUID): Promise<void> {
    await this.records.delete({ orgId });
  }
}
