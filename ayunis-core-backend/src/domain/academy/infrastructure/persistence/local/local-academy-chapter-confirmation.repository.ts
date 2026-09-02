import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { AcademyChapterConfirmationRepository } from 'src/domain/academy/application/ports/academy-chapter-confirmation.repository';
import { AcademyChapterConfirmation } from 'src/domain/academy/domain/academy-chapter-confirmation.entity';
import { AcademyMapper } from './mappers/academy.mapper';
import { AcademyChapterConfirmationRecord } from './schema/academy-chapter-confirmation.record';

@Injectable()
export class LocalAcademyChapterConfirmationRepository extends AcademyChapterConfirmationRepository {
  constructor(
    @InjectPinoLogger(LocalAcademyChapterConfirmationRepository.name)
    private readonly logger: PinoLogger,
    @InjectRepository(AcademyChapterConfirmationRecord)
    private readonly repository: Repository<AcademyChapterConfirmationRecord>,
    private readonly mapper: AcademyMapper,
  ) {
    super();
  }

  async findAllByUser(userId: UUID): Promise<AcademyChapterConfirmation[]> {
    this.logger.info({ userId }, 'findAllByUser');
    const records = await this.repository.find({ where: { userId } });
    return records.map((record) =>
      this.mapper.chapterConfirmationToDomain(record),
    );
  }

  async upsert(
    confirmation: AcademyChapterConfirmation,
  ): Promise<AcademyChapterConfirmation> {
    this.logger.info(
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
