import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import { AcademyChapterConfirmationRepository } from 'src/domain/academy/application/ports/academy-chapter-confirmation.repository';
import { AcademyChapterConfirmation } from 'src/domain/academy/domain/academy-chapter-confirmation.entity';
import { lockLearner } from './lock-learner';
import { AcademyMapper } from './mappers/academy.mapper';
import { AcademyChapterConfirmationRecord } from './schema/academy-chapter-confirmation.record';

@Injectable()
export class LocalAcademyChapterConfirmationRepository extends AcademyChapterConfirmationRepository {
  private readonly logger = new Logger(
    LocalAcademyChapterConfirmationRepository.name,
  );

  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly mapper: AcademyMapper,
  ) {
    super();
  }

  private get repository(): Repository<AcademyChapterConfirmationRecord> {
    return this.txHost.tx.getRepository(AcademyChapterConfirmationRecord);
  }

  async lockForUser(userId: UUID): Promise<void> {
    await lockLearner(this.txHost.tx, userId);
  }

  async findAllByUser(userId: UUID): Promise<AcademyChapterConfirmation[]> {
    this.logger.log({ userId }, 'findAllByUser');
    const records = await this.repository.find({ where: { userId } });
    return records.map((record) =>
      this.mapper.chapterConfirmationToDomain(record),
    );
  }

  async upsert(
    confirmation: AcademyChapterConfirmation,
  ): Promise<AcademyChapterConfirmation> {
    this.logger.log(
      { userId: confirmation.userId, chapterId: confirmation.chapterId },
      'upsert',
    );
    const record = this.mapper.chapterConfirmationToRecord(confirmation);
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .into(AcademyChapterConfirmationRecord)
      .values(record)
      .orUpdate(['confirmedAt'], ['userId', 'chapterId'])
      .returning('*')
      .execute();
    const rows: unknown = result.raw;
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('Confirmation upsert returned no row');
    }
    const saved = this.repository.create(
      rows[0] as Partial<AcademyChapterConfirmationRecord>,
    );
    return this.mapper.chapterConfirmationToDomain(saved);
  }
}
