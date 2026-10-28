import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';

import { AcademyCompletionRepository } from 'src/domain/academy/application/ports/academy-completion.repository';
import { AcademyCompletion } from 'src/domain/academy/domain/academy-completion.entity';
import { AcademyCompletionRecord } from './schema/academy-completion.record';
import { AcademyMapper } from './mappers/academy.mapper';

@Injectable()
export class LocalAcademyCompletionRepository implements AcademyCompletionRepository {
  private readonly logger = new Logger(LocalAcademyCompletionRepository.name);

  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly mapper: AcademyMapper,
  ) {}

  private get repository(): Repository<AcademyCompletionRecord> {
    return this.txHost.tx.getRepository(AcademyCompletionRecord);
  }

  async findByUser(userId: UUID): Promise<AcademyCompletion | null> {
    this.logger.debug({ userId }, 'findByUser');
    const record = await this.repository.findOne({ where: { userId } });
    if (!record) return null;
    return this.mapper.completionToDomain(record);
  }

  async upsert(completion: AcademyCompletion): Promise<AcademyCompletion> {
    this.logger.log({ userId: completion.userId }, 'upsert');
    const record = this.mapper.completionToRecord(completion);
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .into(AcademyCompletionRecord)
      .values(record)
      .orUpdate(['completedAt'], ['userId'])
      .returning('*')
      .execute();
    const rows: unknown = result.raw;
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('Completion upsert returned no row');
    }
    const saved = this.repository.create(
      rows[0] as Partial<AcademyCompletionRecord>,
    );
    return this.mapper.completionToDomain(saved);
  }
}
