import { Injectable } from '@nestjs/common';
import { LegalAcceptancesRepository } from 'src/iam/legal-acceptances/application/ports/legal-acceptances.repository';
import { LegalAcceptancesMapper } from './mappers/legal-acceptances.mapper';
import { LegalAcceptanceRecord } from './schema/legal-acceptance.record';
import { LegalAcceptanceType } from 'src/iam/legal-acceptances/domain/value-objects/legal-acceptance-type.enum';
import { LegalAcceptance } from 'src/iam/legal-acceptances/domain/legal-acceptance.entity';
import { EntityManager, Repository } from 'typeorm';
import { UUID } from 'crypto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class LocalLegalAcceptancesRepository extends LegalAcceptancesRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly legalAcceptancesMapper: LegalAcceptancesMapper,
  ) {
    super();
  }

  private getManager(): EntityManager {
    return this.txHost.tx;
  }

  private get legalAcceptancesRepository(): Repository<LegalAcceptanceRecord> {
    return this.getManager().getRepository(LegalAcceptanceRecord);
  }

  async create(legalAcceptance: LegalAcceptance): Promise<void> {
    const record = this.legalAcceptancesMapper.toRecord(legalAcceptance);
    await this.legalAcceptancesRepository.save(record);
  }

  async findOne(
    orgId: UUID,
    type: LegalAcceptanceType,
    version: string,
  ): Promise<LegalAcceptance | null> {
    const record = await this.legalAcceptancesRepository.findOne({
      where: { orgId, type, version },
    });
    return record ? this.legalAcceptancesMapper.toDomain(record) : null;
  }
}
